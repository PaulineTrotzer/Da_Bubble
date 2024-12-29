import { Component, OnInit, ViewChild, inject } from '@angular/core';
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
export class HomeComponent implements OnInit {
  selectedUser: any;
  selectedChannel: any;
  mentionUser: any;
  isThreadOpen = false;
  successfullyLogged = false;
  LogInAuth = inject(LoginAuthService);
  private loginStatusSub: Subscription | undefined;
  global = inject(GlobalVariableService);
  isGuestLogin = false;
  private guestLoginStatusSub: Subscription | undefined;
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

  ngOnInit(): void {
    this.loginAuthService.googleAccountLogIn$.subscribe((status) => {
      this.googleAccountLogIn = status;
    });
    this.initAuthListener();
    this.subscribeToLoginStatus();
    this.subscribeToGuestLoginStatus();
    this.setDirectThread();
    this.setChannelThread();
  }

  initAuthListener() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.isOverlayVisible = true;
        setTimeout(() => {
          this.isOverlayVisible = false;
        }, 1100);
      } else {
        this.isOverlayVisible = false;
      }
    });
  }

  setDirectThread() {
    this.global.currentThreadMessage$.subscribe((messageId) => {
      this.directThreadId = messageId;
    });
  }

  setChannelThread() {
    this.global.channelThread$.subscribe((messageId) => {
      this.channelThreadId = messageId;
    });
  }

  subscribeToLoginStatus(): void {
    this.loginStatusSub = this.LogInAuth.loginSuccessful$.subscribe(
      (status) => {
        this.successfullyLogged = status;
      }
    );
  }

  subscribeToGuestLoginStatus(): void {
    this.guestLoginStatusSub = this.LogInAuth.isGuestLogin$.subscribe(
      (status) => {
        this.isGuestLogin = status;
      }
    );
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
    this.isThreadOpen = false;
  }

  toggleWorkspace() {
    if (window.innerWidth <= 720 && this.global.openChannelorUserBox) {
      this.global.openChannelorUserBox = false;
    } else if (
      window.innerWidth <= 720 &&
      this.global.openChannelOrUserThread
    ) {
      this.global.openChannelOrUserThread = false;
      this.isWorkspaceOpen = true;
    } else {
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
