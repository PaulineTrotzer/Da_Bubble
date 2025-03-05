import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
  inject,
  ChangeDetectorRef,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { GlobalVariableService } from '../services/global-variable.service';
import { FormsModule } from '@angular/forms';
import { Firestore, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../services/user.service';
import { PeopleMentionComponent } from '../people-mention/people-mention.component';
import { DialogHeaderProfilCardComponent } from '../dialog-header-profil-card/dialog-header-profil-card.component';
import { OverlayStatusService } from '../services/overlay-status.service';
import { DialogEditChannelComponent } from '../dialog-edit-channel/dialog-edit-channel.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogChannelUserComponent } from '../dialog-channel-user/dialog-channel-user.component';
import { DialogAddMemberComponent } from '../dialog-add-member/dialog-add-member.component';
import { ProfileContactCardComponent } from '../profile-contact-card/profile-contact-card.component';
import { ChatComponent } from '../chat/chat.component';
import { WelcomeSheetComponent } from '../welcome-sheet/welcome-sheet.component';
import { Subscription } from 'rxjs';
import { LoginAuthService } from '../services/login-auth.service';
import { UserChannelSelectService } from '../services/user-channel-select.service';
import { MemberDataService } from '../services/member-data.service';
import { AuthService } from '../services/auth.service';
import { WorkspaceService } from '../services/workspace.service';
import { Channel } from '../models/channel.class';
import { ChannelChatComponent } from '../channel-chat/channel-chat.component';

interface ChannelData {
  userIds: string[];
}

@Component({
  selector: 'app-start-screen',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    CommonModule,
    FormsModule,
    PeopleMentionComponent,
    DialogHeaderProfilCardComponent,
    DialogEditChannelComponent,
    DialogAddMemberComponent,
    ProfileContactCardComponent,
    ChatComponent,
    ChannelChatComponent,
    WelcomeSheetComponent,
  ],
  templateUrl: './start-screen.component.html',
  styleUrl: './start-screen.component.scss',
})
export class StartScreenComponent implements OnInit, OnChanges, OnDestroy {
  user: any;
  afterLoginSheet: boolean = false;
  loginSuccessful = false;
  isGuestLogin = false;
  welcomeChannelSubscription: Subscription | undefined;
  currentUserwasSelected = false;
  contactWasSelected = false;
  overlayStatusService = inject(OverlayStatusService);
  openMyProfile = false;
  firestore = inject(Firestore);
  userId: any | null = null;
  route = inject(ActivatedRoute);
  @Input() selectedUser: any;
  @Input() selectedChannel: any;
  @Input() mentionUser: string = '';
  @Input() onHeaderUser: any;
  @Input() onHeaderChannel: any;
  channelMembers: any[] = [];
  messagesData: any = [];
  hoveredName: any;
  userservice = inject(UserService);
  dialog = inject(MatDialog);
  cdr = inject(ChangeDetectorRef);
  LogInAuth = inject(LoginAuthService);
  private loginStatusSub: Subscription | undefined;
  private guestLoginStatusSub: Subscription | undefined;
  loginAuthService = inject(LoginAuthService);
  enterChatByUser: any;
  userChannelService = inject(UserChannelSelectService);
  memberDataService = inject(MemberDataService);
  authService = inject(AuthService);
  statusCheck = false;
  workspaceService = inject(WorkspaceService);
  workspaceSubscription: Subscription | undefined;
  @Output() userSelectedFromStartscreen = new EventEmitter<any>();
  @Output() channelSelectedFromStartscreen = new EventEmitter<any>();
  @Output() enterChat = new EventEmitter<any>();
  @Output() threadOpened = new EventEmitter<void>();

  constructor(public global: GlobalVariableService) {}

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  async ngOnInit(): Promise<void> {
    this.subscribeToWorkspaceChanges();
    this.initializeGlobalState();
    await this.loadUserData();
    this.resetUserSelection();
    this.subscribeToProfileSelection();
    this.subscribeToWelcomeChannel();
    this.subscribeToLoginStatus();
    this.subscribeToUserChanges();
    this.subscribeToChannelChanges();
    this.subscribeToGuestLoginStatus();
    this.authService.initAuthListener();
  }

  subscribeToWorkspaceChanges(): void {
    this.workspaceSubscription = this.workspaceService.selectedUser$.subscribe(
      async (user) => {
        if (user) {
          this.selectedUser = user;
        }
      }
    );
    this.workspaceSubscription.add(
      this.workspaceService.selectedChannel$.subscribe((channel) => {
        if (channel) {
          this.selectedChannel = channel;
        }
      })
    );
  }

  checkStatus(): void {
    if (!this.global.currentUserData || !this.selectedUser) {
      this.statusCheck = false;
      return;
    }
    if (this.global.currentUserData.name === 'Gast') {
      this.statusCheck = false;
    } else if (
      this.global.statusCheck &&
      this.global.currentUserData.name === this.selectedUser.name
    ) {
      this.statusCheck = true;
    } else {
      this.statusCheck = false;
    }
  }

  initializeGlobalState(): void {
    this.global.channelSelected = false;
  }

  async loadUserData(): Promise<void> {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.user = this.userId;
    await this.getcurrentUserById(this.userId);
  }

  subscribeToUserChanges(): void {
    this.userChannelService.selectedUser$.subscribe((user) => {
      this.selectedUser = user;
      if (this.selectedUser) {
        this.resetChannelSelection();
        this.checkProfileType();
        this.cdr.detectChanges();
      }
    });
  }

  subscribeToChannelChanges(): void {
    this.userChannelService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      if (this.selectedChannel) {
        this.resetUserSelection();
        this.fetchChannelMembers();
        this.global.setCurrentChannel(this.selectedChannel);
      }
    });
  }

  resetChannelSelection(): void {
    this.global.channelSelected = false;
    this.selectedChannel = null;
    this.onHeaderChannel = null;
    this.global.clearCurrentChannel();
    this.afterLoginSheet = false;
  }

  resetUserSelection(): void {
    this.selectedUser = null;
    this.onHeaderUser = null;
    this.global.channelSelected = true;
  }

  ngOnDestroy(): void {
    this.workspaceSubscription?.unsubscribe();
    this.welcomeChannelSubscription?.unsubscribe();
    this.loginStatusSub?.unsubscribe();
    this.guestLoginStatusSub?.unsubscribe();
  }

  private subscribeToProfileSelection(): void {
    this.userservice.profileSelection$.subscribe((profileType) => {
      if (profileType) {
        this.resetProfileSelection();
        this.checkProfileType();
        this.openMyProfile = true;
      } else {
        this.closeMyUserProfile();
      }
    });
  }

  subscribeToWelcomeChannel(): void {
    this.welcomeChannelSubscription = this.global.welcomeChannel$.subscribe(
      (welcomeChannelStatus) => {
        this.afterLoginSheet = welcomeChannelStatus;
      }
    );
  }

  subscribeToLoginStatus(): void {
    this.loginStatusSub = this.loginAuthService.loginSuccessful$.subscribe(
      (status) => {
        this.loginSuccessful = status;
      }
    );
  }

  subscribeToGuestLoginStatus(): void {
    this.guestLoginStatusSub = this.loginAuthService.isGuestLogin$.subscribe(
      (status) => {
        this.isGuestLogin = status;
      }
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedChannel']) {
      this.workspaceService.setSelectedChannel(this.selectedChannel);
    }
  }

  resetChannelMessages() {
    return (this.onHeaderChannel.messages = []);
  }

  onMessageForwarded(data: any) {
    this.messagesData.push(data);
  }

  updateSelectedUser(newUser: any) {
    this.selectedUser = newUser;
    this.cdr.detectChanges();
  }

  openDialog(channel: Channel) {
    this.dialog.open(DialogEditChannelComponent, {
      data: channel,
      panelClass: 'edit-dialog',
      maxWidth: '872px',
      maxHeight: '616px',
      disableClose: true,
      autoFocus: true,
    });
  }

  openMemberDialog() {
    this.dialog.open(DialogChannelUserComponent, {
      data: {
        members: this.selectedChannel.userIds,
        channel: this.selectedChannel,
      },
      panelClass: 'member-dialog',
      maxWidth: '415px',
      maxHeight: '411px',
    });
  }

  openAddMemberDialog() {
    this.dialog.open(DialogAddMemberComponent, {
      data: this.selectedChannel,
      panelClass: 'add-member-dialog',
      maxWidth: '514px',
      maxHeight: '320px',
    });
  }

  async fetchChannelMembers() {
    if (!this.selectedChannel?.id) {
      this.channelMembers = [];
      return;
    }
    try {
      const channelRef = doc(
        this.firestore,
        'channels',
        this.selectedChannel.id
      );
      onSnapshot(channelRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as ChannelData;
          const userIds = data['userIds'];
          if (!userIds || userIds.length === 0) {
            this.channelMembers = [];
            return;
          }
          this.channelMembers = await this.fetchMembers(userIds);
          this.memberDataService.setMembers(this.channelMembers);
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Kanalmitglieder:', error);
    }
  }

  async fetchMembers(userIds: string[]): Promise<any[]> {
    const membersPromises = userIds.map((userId) => this.fetchUserData(userId));
    const members = await Promise.all(membersPromises);
    return members.filter((member) => member !== null);
  }

  private async fetchUserData(userId: string): Promise<any | null> {
    const userRef = doc(this.firestore, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  }

  async getcurrentUserById(userId: string) {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        this.global.currentUserData = {
          id: userSnapshot.id,
          ...userSnapshot.data(),
        };
      }
    } catch (error) {
      console.error('Fehler beim Abruf des Benutzers:', error);
    }
  }

  resetProfileSelection() {
    this.currentUserwasSelected = false;
    this.contactWasSelected = false;
  }

  showMyUserProfile() {
    this.resetProfileSelection();
    this.checkProfileType();
    setTimeout(() => {
      this.openMyProfile = true;
    });
  }

  checkProfileType() {
    if (this.selectedUser?.uid === this.userId) {
      this.currentUserwasSelected = true;
    } else {
      this.contactWasSelected = true;
    }
  }

  closeMyUserProfile() {
    this.openMyProfile = false;
    this.overlayStatusService.setOverlayStatus(false);
  }

  onThreadOpened() {
    this.threadOpened.emit();
  }

  enterByUsername(user: any, isChannel: boolean = false) {
    this.enterChatByUser = user;
    this.selectedUser = this.enterChatByUser;
    if (isChannel) {
      this.channelSelectedFromStartscreen.emit(user);
      this.global.setCurrentChannel(user);
    } else {
      this.userSelectedFromStartscreen.emit(user);
      this.global.clearCurrentChannel();
    }
    this.checkProfileType();
  }
}
