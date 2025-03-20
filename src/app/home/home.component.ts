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
    this.global.threadOpened$.subscribe((isOpened) => {
      Promise.resolve().then(() => {
        this.reduceStartScreen = isOpened;
        this.cdr.detectChanges();
      });
    });
    this.isWorkspaceOpen = true; // Workspace soll offen sein
    this.workspaceColumnWidth = '385px'; // Entspricht dem „offenen“ Zustand
    this.global.openChannelorUserBox = true; // Startscreen soll sichtbar sein
    this.onResize({ target: window } as any);
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = window.innerWidth;
    console.log('onResize: width =', width);
    if (
      width >= 951 &&
      !this.isWorkspaceOpen &&
      this.global.openChannelorUserBox &&
      !this.global.threadOpened
    ) {
      this.openWorkspace();
      console.log(
        'Desktop: Workspace wird automatisch geöffnet, da er geschlossen war.'
      );
    }
    if (
      width < 950 &&
      this.global.openChannelorUserBox &&
      this.isWorkspaceOpen
    ) {
      this.closeWorkspace();
      console.log(
        'Zusätzliche Bedingung: Workspace geschlossen (<950px, App-Startscreen offen)'
      );
    }
    if (
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
    if (
      width < 1100 &&
      this.global.threadOpened &&
      this.global.openChannelorUserBox
    ) {
      this.global.openChannelorUserBox = false;
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
  }

  onThreadClosed() {
    this.directThreadId = null;
    this.channelThreadId = null;
    this.isThreadOpen = false;
    this.global.setThreadOpened(false);
    this.openWorkspace();
    this.global.openChannelorUserBox = true;
    const width = window.innerWidth;
    if (width < 950) {
      this.openWorkspace();
      this.global.openChannelorUserBox = false;
    }
  }

  calcThreadWidth(): string {
    // Wenn der Thread nicht offen ist, berechne die Breite z. B. basierend auf 510px
    // oder irgendeinem anderen Wert.
    return '510px';
  }
  calcGridTemplateColumns(): string {
    const threadFixedWidth = '510px';
    const width = window.innerWidth;
    const gap = '32px';
    
    // Mobile-Bereich (unter 951px):
    if (width < 951) {
      if (this.global.threadOpened) {
        // Wenn ein Thread (Direct oder Channel) geöffnet ist, soll dieser den gesamten Bildschirm einnehmen.
        return `0 0 100vw`;
      } else if (this.isWorkspaceOpen) {
        return `100vw 0 0`;
      } else {
        return `0 100vw 0`;
      }
    } else {
      // Desktop-Bereich (width >= 951):
      
      // Falls die User Box (global.openChannelorUserBox) **nicht** aktiv ist:
      if (!this.global.openChannelorUserBox) {
        if (this.global.threadOpened) {
          // NEU: Falls die Breite unter 1100px liegt, soll der Thread den gesamten Raum einnehmen
          // (also "0 0 100vw"), ansonsten verwenden wir den fixen Wert.
          if (width < 1100) {
            return `0 0 100vw`;
          } else {
            return `0 0 ${threadFixedWidth}`;
          }
        } else {
          return `385px 0 0`;
        }
      }
      
      // Standardfall: global.openChannelorUserBox ist aktiv.
      if (this.isWorkspaceOpen) {
        if (this.global.threadOpened) {
          // Workspace und Thread geöffnet:
          return `385px 1fr ${threadFixedWidth}`;
        } else {
          // Workspace offen, Thread geschlossen:
          return `385px 1fr 0`;
        }
      } else {
        // Workspace geschlossen – dann soll der Startscreen den gesamten Platz einnehmen:
        if (this.global.threadOpened) {
          return `0 1fr minmax(${threadFixedWidth}, 1fr)`;
        } else {
          return `0 1fr 0`;
        }
      }
    }
  }
  

  getGridGap(): string {
    const width = window.innerWidth;

    // Im mobilen Bereich (<951px) soll kein Gap verwendet werden.
    if (width < 951) {
      return '0px';
    }

    // Im Desktop:
    // Spezieller Fall: wenn der Bildschirm unter 1450px liegt und
    // der Thread geöffnet ist, die User-Box aktiv ist und der Workspace offen ist,
    // dann soll der Gap 32px betragen.
    if (
      width < 1450 &&
      this.global.threadOpened &&
      !this.isWorkspaceOpen &&
      this.global.openChannelorUserBox
    ) {
      return '32px';
    }

    // Standardfall: Falls der Workspace offen ist, soll der Gap 32px betragen, ansonsten 0.
    return this.isWorkspaceOpen ? '32px' : '0px';
  }

  calcStartScreenContainerWidth(): string {
    const gap = 32; // Abstand zwischen Spalten
    const width = window.innerWidth;

    if (width >= 951) {
      if (this.isWorkspaceOpen) {
        // Workspace offen: Abzug von 385px plus Gap
        return `calc(100vw - 385px - ${gap}px)`;
      } else {
        // Workspace geschlossen:
        if (this.global.threadOpened && this.global.openChannelorUserBox) {
          // Falls Thread offen und UserBox aktiv – evtl. soll der Startscreen
          // nur um den Thread-Bereich verkleinert werden. Beispielsweise:
          return `calc(100vw - 510px - ${gap}px)`;
        } else {
          // Falls kein Thread offen, dann den gesamten Viewport nutzen:
          return `100vw`;
        }
      }
    } else {
      // Mobile-Bereich:
      if (this.isWorkspaceOpen) {
        return `calc(100vw - 385px - ${gap}px)`;
      } else {
        return `100vw`;
      }
    }
  }

  toggleWorkspace(): void {
    const width = window.innerWidth;

    if (width < 951) {
      // Mobile-Logik – wie gehabt
      if (this.isWorkspaceOpen) {
        this.closeWorkspace();
        this.global.openChannelorUserBox = true;
        this.global.setThreadOpened(false);
        this.directThreadId = null;
        this.channelThreadId = null;
      } else {
        this.openWorkspace();
        this.global.openChannelorUserBox = false;
        this.global.setThreadOpened(false);
      }
    } else {
      // Desktop: Hier toggeln wir, dass der Workspace geöffnet wird,
      // wenn er derzeit geschlossen ist – ansonsten bleibt er offen.
      if (!this.isWorkspaceOpen) {
        this.isWorkspaceOpen = true;
        this.workspaceColumnWidth = '385px';
      } else {
        this.isWorkspaceOpen = false;
        this.workspaceColumnWidth = '0px';
      }
    }
  }

  onWorkspaceTransitionEnd(): void {
    // Wenn der Workspace-Inhalt animiert (geschlossen) ist,
    // passe den Grid-Platz an.
    if (!this.isWorkspaceOpen) {
      this.workspaceColumnWidth = '0px';
      // Danach kannst du ggf. detectChanges() aufrufen.
      this.cdr.detectChanges();
    }
  }

  getImageSource(): string {
    const state = this.isWorkspaceOpen ? 'hide' : 'show';
    const variant = this.isHovered ? 'hover' : 'black';
    return `../../assets/img/${state}-workspace-${variant}.png`;
  }
}
