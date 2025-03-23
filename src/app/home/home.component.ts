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
import { animate, style, transition, trigger } from '@angular/animations';

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
  animations: [
    trigger('fadeOutThread', [
      transition(':leave', [
        style({ opacity: 1 }),
        animate('200ms ease', style({ opacity: 0 })),
      ]),
    ]),
  ],
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
    /*    this.global.threadOpened$.subscribe((isOpened) => {
      Promise.resolve().then(() => {
        this.reduceStartScreen = isOpened;
        this.cdr.detectChanges();
      });
    }); */
    this.initializeScreen();
    this.onResize({ target: window } as any);
  }

  initializeScreen() {
    if (window.innerWidth < 950) {
      this.isWorkspaceOpen = false;
    } else {
      this.isWorkspaceOpen = true;
    }
    this.workspaceColumnWidth = '385px';
    this.global.openChannelorUserBox = true;
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = window.innerWidth;
    // Desktop-Bereich (width >= 951px)
    if (width >= 951) {
      // Sonderfall: Wenn width zwischen 1100 und 1450 liegt, threadOpened true, workspaceOpen true und UserBox aktiv,
      // dann schließe den Workspace.
      if (
        width > 1100 &&
        width < 1450 &&
        this.global.threadOpened &&
        this.isWorkspaceOpen &&
        this.global.openChannelorUserBox
      ) {
        this.closeWorkspace();
      }
      if (
        width < 1100 &&
        this.global.threadOpened &&
        this.global.openChannelorUserBox
      ) {
        this.global.openChannelorUserBox = false;
      }
    }

    // Bedingung: Wenn width >= 1450, der Workspace geschlossen ist und die UserBox aktiv ist,
    // dann öffne den Workspace automatisch.
    if (
      width >= 1450 &&
      !this.isWorkspaceOpen &&
      this.global.openChannelorUserBox
    ) {
      this.openWorkspace();
    }

    // Neuer Zusatz: Wenn nur der Thread geöffnet ist (Workspace geschlossen, UserBox inaktiv)
    // und die Bildschirmbreite über 950px liegt, dann toggle (öffne) den Workspace.
    if (
      width >= 950 &&
      !this.isWorkspaceOpen &&
      this.global.threadOpened &&
      !this.global.openChannelorUserBox
    ) {
      this.openWorkspace();
    }

    // Bestehende Bedingung: Wenn width >= 1450, workspace offen, threadOpened true und UserBox inaktiv,
    // dann setze UserBox auf aktiv.
    if (
      width >= 1450 &&
      this.isWorkspaceOpen &&
      this.global.threadOpened &&
      !this.global.openChannelorUserBox
    ) {
      this.global.openChannelorUserBox = true;
    } else {
      // Mobile-Bereich (width < 951):
      if (
        width < 950 &&
        this.global.openChannelorUserBox &&
        this.isWorkspaceOpen
      ) {
        this.closeWorkspace();
      }
    }
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  closeWorkspace(): void {
    this.isWorkspaceOpen = false;
    setTimeout(() => {
      this.workspaceColumnWidth = '0px';
      this.cdr.detectChanges();
    }, 300);
  }

  openWorkspace(): void {
    const width = window.innerWidth;
    if (width < 951) {
      // Mobile: Reserviere 100% Platz
      this.workspaceColumnWidth = '100%';
    } else {
      this.workspaceColumnWidth = '385px';
    }
    setTimeout(() => {
      this.isWorkspaceOpen = true;
      this.cdr.detectChanges();
    }, 10);
  }

  workspaceColumnWidth: string = '385px';

  get isThreadOpened(): boolean {
    return !!(this.directThreadId || this.channelThreadId);
  }

  updateStartScreenWidth(): void {
    this.startScreenWidth = this.calcGridTemplateColumns();
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
    this.global.setThreadOpened(true);
    if (window.innerWidth < 1450 && this.global.openChannelorUserBox) {
      this.global.openChannelorUserBox = true;
      this.closeWorkspace();
    }
  }

  onThreadClosed() {
    this.directThreadId = null;
    this.channelThreadId = null;
    this.global.setThreadOpened(false);
    this.global.openChannelorUserBox = true;
    const width = window.innerWidth;
    if (width < 950) {
      this.openWorkspace();
      this.global.openChannelorUserBox = false;
    }
  }

  calcThreadWidth(): string {
    return '510px';
  }

  calcGridTemplateColumns(): string {
    const workspaceWidth = '385px';
    const threadFixedWidthStandard = '510px';
    const width = window.innerWidth;
    const gap = '32px'; // Wird separat via [style.gap] gesetzt

    // 1. Mobile-Bereich (width < 951):
    if (width < 951) {
      if (this.global.threadOpened) {
        return `0 0 100vw`;
      } else if (this.isWorkspaceOpen) {
        if (this.global.openChannelorUserBox) {
          return `0 1fr 0`;
        } else {
          return `100vw 0 0`;
        }
      } else {
        return `0 100vw 0`;
      }
    }
  
  
    // 2a. Sonderfall: Nur der Thread offen (Workspace geschlossen, UserBox inaktiv)
    if (!this.isWorkspaceOpen && this.global.threadOpened && !this.global.openChannelorUserBox) {
      return `0 0 100vw`;
    }
  
    // 2b. Sonderfall: width < 1450, Workspace offen, Thread offen, UserBox geschlossen
    if (
      width < 1450 &&
      this.isWorkspaceOpen &&
      this.global.threadOpened &&
      !this.global.openChannelorUserBox
    ) {
      return `${workspaceWidth} 0 1fr`;
    }
  
    // 2c. Explizite Unterscheidung: Workspace offen UND UserBox aktiv
    if (this.isWorkspaceOpen && this.global.openChannelorUserBox) {
      if (this.global.threadOpened) {
        return `${workspaceWidth} 1fr ${threadFixedWidthStandard}`;
      } else {
        return `${workspaceWidth} 1fr 0`;
      }
    }
  
    // 2d. Falls die UserBox nicht aktiv ist (false)
    if (!this.global.openChannelorUserBox) {
      if (this.global.threadOpened) {
        if (width < 1100) {
          return `0 0 100vw`;
        } else {
          return `0 0 ${threadFixedWidthStandard}`;
        }
      } else {
        return `${workspaceWidth} 0 0`;
      }
    }
  
    // 2e. Standardfall: Workspace geschlossen, UserBox aktiv
    if (!this.isWorkspaceOpen && this.global.openChannelorUserBox) {
      if (this.global.threadOpened) {
        return `0 1fr minmax(${threadFixedWidthStandard}, 1fr)`;
      } else {
        return `0 1fr 0`;
      }
    }
    return `0 1fr 0`;
  }
  


  getGridGap(): string {
    const width = window.innerWidth;
    if (width < 951) {
      return '0px';
    }
    if (this.isWorkspaceOpen || (!this.isWorkspaceOpen && this.global.threadOpened && this.global.openChannelorUserBox)) {
      return '32px';
    }
    return '0px';
  }
  

  calcStartScreenContainerWidth(): string {
    const gap = 32;
    const width = window.innerWidth;

    if (width >= 951) {
      // Desktop-Bereich
      if (this.isWorkspaceOpen) {
        // Wenn der Workspace geöffnet ist, wird immer die Breite abgezogen
        return `calc(100vw - 385px - ${gap}px)`;
      } else {
        if (this.global.threadOpened && this.global.openChannelorUserBox) {
          return `calc(100vw - 510px - ${gap}px)`;
        } else {
          return `100vw`;
        }
      }
    } else {
      // Mobile-Bereich: Hier reicht 100vw, da calcGrid dies bereits übernimmt
      return `100vw`;
    }
  }

  toggleWorkspace(): void {
    const width = window.innerWidth;
    if (width < 951) {
      // Mobile-Logik:
      if (this.isWorkspaceOpen) {
        this.closeWorkspace();
        // Beim Schließen soll die UserBox sichtbar werden
        this.global.openChannelorUserBox = true;
        this.global.setThreadOpened(false);
        this.directThreadId = null;
        this.channelThreadId = null;
      } else {
        this.openWorkspace();
        // Beim Öffnen soll die UserBox verschwinden
        this.global.openChannelorUserBox = false;
        this.global.setThreadOpened(false);
      }
      if (
        width < 1450 &&
        this.isWorkspaceOpen &&
        this.global.openChannelorUserBox &&
        this.global.threadOpened
      ) {
        this.closeWorkspace();
      }
    } else {
      // Desktop-Bereich:
      // Falls der Workspace bereits offen ist und die UserBox aktiv, dann muss der Workspace auf 0 (geschlossen) gehen.
      if (this.isWorkspaceOpen && this.global.openChannelorUserBox) {
        this.isWorkspaceOpen = false;
        this.workspaceColumnWidth = '0px';
      } else {
        if (!this.isWorkspaceOpen) {
          this.isWorkspaceOpen = true;
          this.workspaceColumnWidth = '385px';
        } else {
          this.isWorkspaceOpen = false;
          this.workspaceColumnWidth = '0px';
        }
      }
      if (
        width < 1450 &&
        this.global.threadOpened &&
        this.global.openChannelorUserBox
      ) {
        this.global.openChannelorUserBox = false;
      }
    }
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  onWorkspaceTransitionEnd(): void {
    if (!this.isWorkspaceOpen) {
      this.workspaceColumnWidth = '0px';
      this.cdr.detectChanges();
    }
  }

  getImageSource(): string {
    const state = this.isWorkspaceOpen ? 'hide' : 'show';
    const variant = this.isHovered ? 'hover' : 'black';
    return `../../assets/img/${state}-workspace-${variant}.png`;
  }
}
