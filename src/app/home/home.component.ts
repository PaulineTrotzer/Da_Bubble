import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  Renderer2,
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
  isMobileView = false;
  reduceStartScreen = false;

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
      });
    });
    this.onResize({ target: window } as any);
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    // Hier rufst du einfach detectChanges auf, damit die Binding-Funktion (calculateStartScreenWidth)
    // neu ausgewertet wird.
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }
  
  checkScreenWidth(width: number) {
    if (width < 1380) {
      this.isWorkspaceOpen = false;
    } else {
      this.isWorkspaceOpen = true;
    }
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

  ngAfterViewInit() {
    /*     this.workspaceComponent.userSelected.subscribe((user: any) => {
      this.selectedUser = user;
      this.userChannelService.setSelectedUser(user);
    }); */
    // Starte die Prüfung nach der initialen Change Detection
    setTimeout(() => {
/*       this.onResize({ target: window } as any); */
      // Damit Angular den neuen Zustand übernimmt:
      this.cdr.detectChanges();
    }, 0);
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

  onThreadOpened() {
    this.isThreadOpen = true;
  }

  onThreadClosed() {
    debugger;
    this.isThreadOpen = false;
    this.global.openChannelOrUserThread = false;
    this.isWorkspaceOpen = true;
  }

  cdr = inject(ChangeDetectorRef);

/*   @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    setTimeout(() => {
      if (width > 770) {
        this.isWorkspaceOpen = true;
        console.log(this.global.threadOpened)
        // Wenn der Thread offen ist, setze reduceStartScreen auf true, sonst false.
        this.reduceStartScreen = this.global.threadOpened;
      } else {
        this.reduceStartScreen = false;
      }
      this.cdr.detectChanges(); // Falls nötig, um den Change Detection Zyklus anzustoßen
    }, 0);
  } */


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
      // Lineare Interpolation zwischen 2090 (80%) und 1600 (60%)
      const slope = (60 - 80) / (1600 - 2090); // ( -20 ) / (-490) = 20/490 ≈ 0.0408
      const percentage = 80 + slope * (width - 2090);
      return percentage + '%';
    }
  }
  

  toggleWorkspace() {
    const width = window.innerWidth;

    if (width <= 770) {
      // 1) Schmale Screens (320–600 px)
      if (this.global.openChannelorUserBox) {
        this.global.openChannelorUserBox = false;
      } else if (this.global.openChannelOrUserThread) {
        this.global.openChannelOrUserThread = false;
        this.isWorkspaceOpen = true;
      } else {
        this.isWorkspaceOpen = !this.isWorkspaceOpen;
      }
    } /* else if (width <= 720) {
      // 2) Screen 401–720 px
      if (this.global.openChannelorUserBox) {
        this.global.openChannelorUserBox = false;
      } else if (this.global.openChannelOrUserThread) {
        this.global.openChannelOrUserThread = false;
        this.isWorkspaceOpen = true;
      } else {
        this.isWorkspaceOpen = !this.isWorkspaceOpen;
      }
  
    } */ else {
      // 3) Breiter als 720 px
      this.isWorkspaceOpen = !this.isWorkspaceOpen;
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
