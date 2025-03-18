import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { WorkspaceComponent } from '../workspace/workspace.component';
import { StartScreenComponent } from '../start-screen/start-screen.component';
import { ThreadComponent } from '../thread/thread.component';
import { GlobalVariableService } from '../services/global-variable.service';
import { CommonModule } from '@angular/common';
import { LoginAuthService } from '../services/login-auth.service';
import { MatCardModule } from '@angular/material/card';
import { Subscription } from 'rxjs';
import { getAuth, onAuthStateChanged } from '@angular/fire/auth';
import { UserChannelSelectService } from '../services/user-channel-select.service';
import {
  Firestore,
  collection,
  doc,
  onSnapshot,
} from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeaderComponent,
    WorkspaceComponent,
    StartScreenComponent,
    ThreadComponent,
    CommonModule,
    MatCardModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit {
  selectedUser: any;
  selectedChannel: any;
  mentionUser: any;
  isThreadOpen = false;
  successfullyLogged = false;
  LogInAuth = inject(LoginAuthService);
  loginStatusSub: Subscription | undefined;
  global = inject(GlobalVariableService);
  isGuestLogin = false;
  guestLoginStatusSub: Subscription | undefined;
  onHeaderUser: any;
  onHeaderChannel: any;
  directThreadId: string | null = null;
  channelThreadId: string | null = null;
  isWorkspaceOpen: boolean = true;
  isHovered: boolean = false;
  googleAccountLogIn: boolean = false;
  @ViewChild(WorkspaceComponent) workspaceComponent!: WorkspaceComponent;
  loginAuthService = inject(LoginAuthService);
  isOverlayVisible = true;
  userChannelService = inject(UserChannelSelectService);
  firestore = inject(Firestore);
  authService = inject(AuthService);
  isOverlayOpen = false;
  private subscriptions: Subscription[] = [];
  reduceStartScreen = false;
  specialSpaceOption = false;
  cdr = inject(ChangeDetectorRef);
  startScreenWidth: string = '100%';

  constructor(private renderer: Renderer2, private el: ElementRef) {}

  ngOnInit(): void {
    this.loginAuthService.googleAccountLogIn$.subscribe((status) => {
      this.googleAccountLogIn = status;
    });
    this.initAuthListener();
    this.subscribeToLoginStatus();
    this.subscribeToGuestLoginStatus();
    this.setDirectThread();
    this.setChannelThread();
    this.authService.initAuthListener();
    this.global.threadOpened$.subscribe((isOpened) => {
      Promise.resolve().then(() => {
        this.reduceStartScreen = isOpened;
        if (
          window.innerWidth > 1020 &&
          this.isWorkspaceOpen &&
          !this.global.openChannelorUserBox &&
          isOpened
        ) {
          this.specialSpaceOption = true;
        } else {
          this.specialSpaceOption = false;
        }
        this.cdr.detectChanges();
      });
    });
    this.onResize({ target: window } as any);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = window.innerWidth;
    console.log('onResize: width =', width);
    if (width < 900) {
      if (
        this.global.openChannelorUserBox &&
        !this.global.threadOpened &&
        this.isWorkspaceOpen
      ) {
        this.isWorkspaceOpen = false;
      }
    } else {
      if (
        this.global.openChannelorUserBox &&
        this.global.threadOpened &&
        this.isWorkspaceOpen
      ) {
        this.isWorkspaceOpen = false;
      }
    }
    if (
      width < 950 &&
      !this.global.openChannelorUserBox &&
      this.global.threadOpened &&
      this.isWorkspaceOpen
    ) {
      this.isWorkspaceOpen = false;
    }
    if (
      width < 1100 &&
      this.global.openChannelorUserBox &&
      this.global.threadOpened
    ) {
      this.global.openChannelorUserBox = false;
    }
    if (
      width > 1020 &&
      this.isWorkspaceOpen &&
      !this.global.openChannelorUserBox &&
      this.global.threadOpened
    ) {
      this.specialSpaceOption = true;
    } else {
      this.specialSpaceOption = false;
    }
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  async loadUserData(userId: string) {
    const userRef = collection(this.firestore, 'users');
    const userDocRef = doc(userRef, userId);
    onSnapshot(userDocRef, (docSnapshot: { data: () => any }) => {
      const dataUser = docSnapshot.data();
      if (dataUser) {
        const userName = dataUser['name'];
        const userPicture = dataUser['profilePicture'];
        const uid = dataUser['uid'];
        if (uid === userId) {
          this.selectedUser = { userName, userPicture, uid };
        }
      }
    });
  }

  handleEnterChat(member: any) {
    if (this.workspaceComponent) {
      this.workspaceComponent.enterByUsername(member, false);
    }
  }

  initAuthListener() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.isOverlayVisible = true;
        setTimeout(() => {
          this.isOverlayVisible = false;
        }, 1100);
        this.loadUserData(user.uid);
      } else {
        this.isOverlayVisible = false;
        this.selectedUser = null;
      }
    });
  }

  handleMobileChannelSelected() {
    this.isWorkspaceOpen = false;
  }

  ngAfterViewInit() {
    // Erzwinge ein initiales Update der Layout-Zustände
    this.onResize({ target: window } as any);

    this.workspaceComponent.channelSelected.subscribe((channel: any) => {
      this.selectedChannel = channel;
      this.global.channelSelected = true;
      this.userChannelService.setSelectedChannel(channel);
    });
    const header = this.el.nativeElement.querySelector('app-header');
    const fullPageContent =
      this.el.nativeElement.querySelector('.full-page-content');
    if (header && fullPageContent) {
      const headerHeight = header.offsetHeight;
      this.renderer.setStyle(
        fullPageContent,
        'height',
        `calc(100vh - ${headerHeight}px)`
      );
    }
  }

  setDirectThread() {
    const directThreadSub = this.global.currentThreadMessage$.subscribe(
      (messageId) => {
        this.directThreadId = messageId;
      }
    );
    this.subscriptions.push(directThreadSub);
  }

  setChannelThread() {
    const channelThreadSub = this.global.channelThread$.subscribe(
      (messageId) => {
        this.channelThreadId = messageId;
      }
    );
    this.subscriptions.push(channelThreadSub);
  }

  subscribeToLoginStatus() {
    const loginStatusSub = this.LogInAuth.loginSuccessful$.subscribe(
      (status) => {
        this.successfullyLogged = status;
      }
    );
    this.subscriptions.push(loginStatusSub);
  }

  subscribeToGuestLoginStatus() {
    const guestLoginStatusSub = this.LogInAuth.isGuestLogin$.subscribe(
      (status) => {
        this.isGuestLogin = status;
      }
    );
    this.subscriptions.push(guestLoginStatusSub);
  }

  onHeaderUserSelected(user: any) {
    this.onHeaderUser = user;
    this.global.clearCurrentChannel();
    if (this.workspaceComponent) {
      this.workspaceComponent.selectUser(user);
    }
  }

  onHeaderchannelSelected(channel: any) {
    this.onHeaderChannel = channel;
    this.global.setCurrentChannel(channel);

    if (this.workspaceComponent) {
      this.workspaceComponent.selectChannel(channel);
    }
  }

  onUserSelected(user: any) {
    this.selectedUser = user;
    this.global.clearCurrentChannel();
  }

  onChannelSelected(channel: any) {
    this.selectedChannel = channel;
    this.global.setCurrentChannel(channel);
  }

  handleUserSelectionFromStartscreen(user: any) {
    this.selectedUser = user;
    this.onHeaderUser = user;
    this.selectedChannel = null;
    this.onHeaderChannel = null;
    this.workspaceComponent.enterByUsername(user, false);
  }

  handleChannelSelectionFromStartscreen(channel: any) {
    this.selectedChannel = channel;
    this.onHeaderChannel = channel;
    this.selectedUser = null;
    this.onHeaderUser = null;
    this.workspaceComponent.enterByUsername(channel, true);
  }

  handleUserSelectionFromThread(user: any) {
    this.selectedUser = user;
    this.onHeaderUser = user;
    this.selectedChannel = null;
    this.onHeaderChannel = null;
    if (this.workspaceComponent) {
      this.workspaceComponent.enterByUsername(user, false);
    }
  }

  handleUserSelectionFromChannelThread(user: any) {
    this.selectedUser = user;
    this.onHeaderUser = user;
    this.selectedChannel = null;
    this.onHeaderChannel = null;
    if (this.workspaceComponent) {
      this.workspaceComponent.enterByUsername(user, false);
    }
  }

  onThreadOpened(): void {
    this.isThreadOpen = true;
    setTimeout(() => {
      this.updateLayout();
    }, 0);
  }

  updateLayout(): void {
    const width = window.innerWidth;
    if (
      width < 1500 &&
      this.isWorkspaceOpen &&
      this.global.openChannelorUserBox
    ) {
      this.global.openChannelorUserBox = false;
    }
    this.cdr.detectChanges();
  }

  onThreadClosed() {
    this.isThreadOpen = false;
    this.isWorkspaceOpen = true;
    if (window.innerWidth < 1350) {
      this.global.openChannelorUserBox = true;
    }
  }

  calculateStartScreenWidth(): string {
    const width = window.innerWidth;
    if (!this.global.threadOpened) {
      return '100%';
    }
    if (width >= 2090) {
      return '80%';
    } else if (width <= 1600) {
      return '60%';
    } else {
      const slope = (60 - 80) / (1600 - 2090);
      const percentage = 80 + slope * (width - 2090);
      return percentage + '%';
    }
  }

  toggleWorkspace() {
    const width = window.innerWidth;

    // Fall 1: Kleine Screens (<951px) und bereits: kein Channel offen (false) aber ein Thread offen (true)
    if (
      width < 951 &&
      !this.global.openChannelorUserBox &&
      this.global.threadOpened
    ) {
      // Wir schließen den Thread und aktivieren den Channel-Bereich:
      this.global.setThreadOpened(false);
      this.directThreadId = null;
      this.channelThreadId = null;
      // Workspace soll in diesem Fall geschlossen werden,
      // sodass der Channelbereich (openChannelorUserBox) aktiv bleibt.
      this.isWorkspaceOpen = false;
      this.global.openChannelorUserBox = true;
      console.log(
        'Kleiner Screen, Thread offen, Channel nicht aktiv: Workspace geschlossen, Channel aktiviert'
      );
    }
    // Fall 2: Kleine Screens (<951px) und andere Fälle (z.B. wenn entweder channel oder thread nicht aktiv sind)
    else if (width < 951) {
      // Toggle-Logik für kleine Screens:
      if (this.isWorkspaceOpen) {
        // Wenn der Workspace offen ist, schließen wir ihn und aktivieren den Channel-/Userbereich.
        this.isWorkspaceOpen = false;
        this.global.openChannelorUserBox = true;
        // Schließe auch den Thread, falls offen.
        this.global.setThreadOpened(false);
        this.directThreadId = null;
        this.channelThreadId = null;
        console.log(
          'Kleiner Screen: Workspace war offen → jetzt geschlossen, Channel aktiviert'
        );
      } else {
        // Wenn der Workspace geschlossen ist, öffnen wir ihn und deaktivieren den Channel-/Userbereich.
        this.isWorkspaceOpen = true;
        this.global.openChannelorUserBox = false;
        // Falls erforderlich: Thread-Status hier ebenfalls auf false setzen.
        this.global.setThreadOpened(false);
        console.log(
          'Kleiner Screen: Workspace war geschlossen → jetzt geöffnet, Channel deaktiviert'
        );
      }
    }
    // Fall 3: Große Screens (>=951px)
    else {
      // Normale Toggle-Logik für große Bildschirme:
      this.isWorkspaceOpen = !this.isWorkspaceOpen;
      console.log('Große Screen: Workspace getoggelt →', this.isWorkspaceOpen);
    }
  }

  getImageSource(): string {
    const state =
      this.isWorkspaceOpen && !this.global.openChannelorUserBox
        ? 'hide'
        : 'show';
    const variant = this.isHovered ? 'hover' : 'black';
    return `../../assets/img/${state}-workspace-${variant}.png`;
  }
}
