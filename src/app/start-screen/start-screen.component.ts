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
import { User } from '../models/user.class';
import { WorkspaceService } from '../services/workspace.service';

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
  @Output() enterChat = new EventEmitter<any>();
  channelMembers: any[] = [];
  messagesData: any = [];
  commentImages: string[] = [
    '../../assets/img/comment/hand.png',
    '../../assets/img/comment/celebration.png',
  ];
  commentStricker: string[] = [
    '../../assets/img/comment/face.png',
    '../../assets/img/comment/rocket.png',
  ];
  concatStickerArray: string[] = [
    ...this.commentImages,
    ...this.commentStricker,
  ];
  isHovered: any = false;
  hoveredName: any;
  hoveredSenderName: any;
  hoveredCurrentUser: any;
  hoveredRecipienUser: any;
  userservice = inject(UserService);
  dialog = inject(MatDialog);
  showStickerDiv: any;
  checkUpdateBackcolor: any;
  isiconShow: any;
  selectFiles: any[] = [];
  cdr = inject(ChangeDetectorRef);
  LogInAuth = inject(LoginAuthService);
  @Output() threadOpened = new EventEmitter<void>();
  private loginStatusSub: Subscription | undefined;
  private guestLoginStatusSub: Subscription | undefined;
  loginAuthService = inject(LoginAuthService);
  enterChatByUser: any;
  userChannelService = inject(UserChannelSelectService);
  memberDataService = inject(MemberDataService);
  authService = inject(AuthService);
  statusCheck = false;
  workspaceService=inject(WorkspaceService);
  workspaceSubscription: Subscription | undefined;

  constructor(public global: GlobalVariableService) {}

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  async ngOnInit(): Promise<void> {
    this.workspaceSubscription = this.workspaceService.selectedUser$.subscribe(
      async (user) => {
        if (user) {
          this.selectedUser = user;
          console.log('user chat comp',user);
      /*     await this.getSelectedMessages(this.selectedUser); */
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
    this.checkStatus();
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

  checkStatus(): void {
    if (!this.global.currentUserData || !this.selectedUser) {
      console.log('Daten noch nicht geladen oder unvollständig');
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
    if (this.loginStatusSub) {
      this.loginStatusSub.unsubscribe();
    }
    if (this.guestLoginStatusSub) {
      this.guestLoginStatusSub.unsubscribe();
    }
    if (this.welcomeChannelSubscription) {
      this.welcomeChannelSubscription.unsubscribe();
    }
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

  @Input() onHeaderChannel: any;
  ngOnChanges(changes: SimpleChanges) {
    if (changes['onHeaderUser'] && this.onHeaderUser) {
      this.selectedChannel = null;
      this.onHeaderChannel = null;
      this.global.channelSelected = false;
      this.selectedUser = this.onHeaderUser;
      this.checkProfileType();
      this.global.clearCurrentChannel();
      this.afterLoginSheet = false;
    }
    if (changes['onHeaderChannel'] && this.onHeaderChannel) {
      this.selectedUser = null;
      this.onHeaderUser = null;
      this.selectedChannel = this.onHeaderChannel;
      this.fetchChannelMembers();
      this.global.setCurrentChannel(this.onHeaderChannel);
    }
    if (changes['selectedUser'] && this.selectedUser) {
    }
  }

  resetChannelMessages() {
    console.log(this.onHeaderChannel.messages);
    return (this.onHeaderChannel.messages = []);
  }

  onMessageForwarded(data: any) {
    this.messagesData.push(data);
  }

  updateSelectedUser(newUser: any) {
    this.selectedUser = newUser;
    this.cdr.detectChanges();
  }

  openDialog() {
    this.dialog.open(DialogEditChannelComponent, {
      data: this.selectedChannel,
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
            console.log('Keine Benutzer im Kanal vorhanden.');
            this.channelMembers = [];
            return;
          }
          const membersPromises = userIds.map(async (userId: string) => {
            const userRef = doc(this.firestore, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              return {
                id: userSnap.id,
                ...userSnap.data(),
              };
            }
            return null;
          });

          const members = await Promise.all(membersPromises);
          this.channelMembers = members.filter(
            (member: any) => member !== null
          );
          this.memberDataService.setMembers(members);
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Kanalmitglieder:', error);
    }
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
        this.userservice.observingUserChanges(userId, (updatedUser: User) => {
          this.selectedUser = updatedUser;
        });
      }
    } catch (error) {
      console.error('Fehler beim Abruf s Benutzers:', error);
    }
  }

  resetProfileSelection() {
    this.currentUserwasSelected = false;
    this.contactWasSelected = false;
  }

  showMyUserProfile() {
    this.resetProfileSelection();
    this.checkProfileType();
    this.openMyProfile = true;
    this.overlayStatusService.setOverlayStatus(this.openMyProfile);
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
  @Output() userSelectedFromStartscreen = new EventEmitter<any>();
  @Output() channelSelectedFromStartscreen = new EventEmitter<any>();

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
