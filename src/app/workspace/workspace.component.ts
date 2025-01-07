import {
  Firestore,
  Unsubscribe,
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from '@angular/fire/firestore';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DialogCreateChannelComponent } from '../dialog-create-channel/dialog-create-channel.component';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';
import { LoginAuthService } from '../services/login-auth.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { WorkspaceService } from '../services/workspace.service';
import { UserChannelSelectService } from '../services/user-channel-select.service';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, MatDialogModule, DialogCreateChannelComponent],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
})
export class WorkspaceComponent implements OnInit {
  selectedChannel: any = null;
  channelDrawerOpen: boolean = true;
  messageDrawerOpen: boolean = true;
  userId: any | null = null;
  route = inject(ActivatedRoute);
  firestore = inject(Firestore);
  userData: any = {};
  allUsers: any = [];
  allChannels: Channel[] = [];
  user: User = new User();
  unsub?: () => void;
  checkUsersExsists: boolean = false;
  userService = inject(UserService);
  @Output() userSelected = new EventEmitter<any>();
  @Output() channelSelected = new EventEmitter<Channel>();
  @Input() selectedUserHome: any;
  @Input() selectedChannelHome: any;
  readonly dialog = inject(MatDialog);
  channelsUnsubscribe: Unsubscribe | undefined;
  logInAuth = inject(LoginAuthService);
  isGuestLogin = true;
  guestLoginStatusSub: Subscription | undefined;
  clickedUsers: string[] = [];
  id: any;
  selectedUsers: any[] = [];
  messageCountsArr: any = {};
  selectedUser: any;
  authService = inject(AuthService);
  loginAuthService = inject(LoginAuthService);
  workspaceService = inject(WorkspaceService);
  filteredChannels: Channel[] = [];
  userChannels: string[] = [];
  currentUserData: any;
  channelService = inject(UserChannelSelectService);

  constructor(
    public global: GlobalVariableService,
  ) {
    this.authService.initAuthListener();
  }


  ngOnInit(): void {
    this.global.currentUserData$.subscribe((data: any) => {
      this.currentUserData = data;
    });
    this.initializeChannelsAndUsers();
    this.observeUserChanges();
    this.subscribeToGuestLoginStatus();
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.initializeUserData(this.userId);
    }
    this.subscribeToWorkspaceChanges();
  }


  filterChannels(channels: any) {
    if (!this.userId) {
      console.warn('Keine userID gefunden, Filterung wird übersprungen.');
      return;
    }
    const willkommenChannel = channels.find(
      (channel: { name: string }) => channel.name === 'Willkommen'
    );

    this.filteredChannels = channels.filter(
      (channel: { userIds: string | any[] }) =>
        channel.userIds && channel.userIds.includes(this.userId)
    );
    if (
      willkommenChannel &&
      !this.filteredChannels.includes(willkommenChannel)
    ) {
      this.filteredChannels.unshift(willkommenChannel);
    }
  }

  async initializeChannelsAndUsers() {
    await this.getAllChannels();
    await this.getAllUsers();
  }

  observeUserChanges() {
    if (this.userId) {
      this.userService.observingUserChanges(
        this.userId,
        (updatedUser: User) => {
          this.global.currentUserData.name = updatedUser.name;
        }
      );
    }
  }

  async initializeUserData(userId: string) {
    await this.getUserById(userId);
    this.getUserMessageCount(userId);
  }

  subscribeToWorkspaceChanges() {
    this.workspaceService.selectedUser$.subscribe((user) => {
      if (user) {
        this.selectUser(user);
      }
    });

    this.workspaceService.selectedChannel$.subscribe((channel) => {
      if (channel) {
        this.selectedChannel = channel;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.channelsUnsubscribe) {
      this.channelsUnsubscribe();
    }
  }

  async subscribeToGuestLoginStatus(): Promise<void> {
    this.guestLoginStatusSub = this.logInAuth.isGuestLogin$.subscribe(
      (status) => {
        this.isGuestLogin = status;
      }
    );
  }

  get filteredUsers() {
    return this.allUsers.filter((user: { name: string; }) => user.name !== 'Gast');
  }


/* 
  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['selectedUserHome'] &&
      !changes['selectedUserHome'].firstChange
    ) {
      this.selectedUser = this.selectedUserHome;
      this.userSelected.emit(this.selectedUser);
    }
    if (
      changes['selectedChannelHome'] &&
      !changes['selectedChannelHome'].firstChange
    ) {
      this.selectedChannel = this.selectedChannelHome;
      this.channelSelected.emit(this.selectedChannel);
    }
  } */

  selectUser(user: any) {

    this.selectedChannel = null;
    setTimeout(() => {
      this.selectedUser = user;
      this.userSelected.emit(user);
      this.id = user.id;
      this.global.currentThreadMessageSubject.next('');
      this.global.channelThreadSubject.next(null);
      const actuallyId = this.id;
      if (
        this.userId &&
        this.messageCountsArr?.messageCount &&
        this.messageCountsArr.messageCount[actuallyId] > 0
      ) {
        const docRef = doc(this.firestore, 'messageCounts', this.userId);
        const resetMessageCount: any = {};
        resetMessageCount[`messageCount.${actuallyId}`] = 0;
        updateDoc(docRef, resetMessageCount);
      }
      this.global.statusCheck = false;
      debugger;
      this.channelService.setSelectedUser(user);
      this.openvollWidtChannelOrUserBox();
      this.hiddenVoolThreadBox();
      this.checkWidtSize();
      this.cheackChatOpen();
    });
  }

  openvollWidtChannelOrUserBox() {
    if (window.innerWidth <= 1349 && window.innerWidth > 720) {
      return (this.global.checkWideChannelorUserBox = true);
    } else {
      return (this.global.checkWideChannelorUserBox = false);
    }
  }

  hiddenVoolThreadBox() {
    if (
      window.innerWidth <= 1349 &&
      window.innerWidth > 720 &&
      this.global.checkWideChannelOrUserThreadBox
    ) {
      this.global.checkWideChannelOrUserThreadBox = false;
    }
  }

  cheackChatOpen() {
    if (window.innerWidth <= 720 && this.global.openChannelOrUserThread) {
      this.global.openChannelOrUserThread = false;
    }
  }

  checkWidtSize() {
    if (window.innerWidth <= 720) {
      return (this.global.openChannelorUserBox = true);
    } else {
      return (this.global.openChannelorUserBox = false);
    }
  }

  selectCurrentUser() {
    this.selectedChannel = null;
    this.selectedUser = this.global.currentUserData;
    this.userSelected.emit(this.global.currentUserData);
    this.global.statusCheck = true;
    this.checkWidtSize();
  }

  openDialog() {
    const dialogRef = this.dialog.open(DialogCreateChannelComponent, {
      data: {
        userId: this.userId,
      },
      height: '539px',
      width: '872px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        console.warn('Kein Ergebnis vom Dialog zurückgegeben');
        return;
      }
      this.getAllChannels();
      const isChannel = result.hasOwnProperty('userIds');
      this.enterByUsername(result, isChannel);
    });
  }

  findWelcomeChannel() {
    const willkommenChannel = this.allChannels.find(
      (channel) => channel.name === 'Willkommen'
    );
    if (willkommenChannel) {
      if (!this.filteredChannels.includes(willkommenChannel)) {
        this.filteredChannels.unshift(willkommenChannel);
      }
      if (!this.selectedChannel) {
        this.selectChannel(willkommenChannel);
      }
    } else {
      console.warn('Kein Willkommen-Channel gefunden!');
    }
  }

  async getAllChannels(): Promise<void> {
    try {
      const colRef = collection(this.firestore, 'channels');
      this.channelsUnsubscribe = onSnapshot(colRef, (snapshot) => {
        const newChannels = snapshot.docs.map((doc) => doc.data() as Channel);
        if (newChannels.length > 0) {
          this.allChannels = newChannels;
          this.sortChannels();
          this.findWelcomeChannel();
          if (this.logInAuth.getIsGuestLogin()) {
            this.filteredChannels = [...this.allChannels];
          } else {
            this.filterChannels(this.allChannels);
          }
        } else {
          console.warn('Keine Kanäle gefunden!');
        }
      });
    } catch (error) {
      console.error('Fehler in getAllChannels:', error);
    }
  }

  sortChannels() {
    this.allChannels.sort((a, b) => {
      if (a.name === 'Willkommen') return -1;
      if (b.name === 'Willkommen') return 1;
      return 0;
    });
  }

  async getUserById(userId: string) {
    const userDocref = doc(this.firestore, 'users', userId);
    onSnapshot(userDocref, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const id = docSnapshot.id;
        this.global.currentUserData = { id: id, ...data };
      } else {
        this.global.currentUserData = {};
      }
    });
    console.log('name is', this.global.currentUserData.name);
  }

  getUserMessageCount(userId: string) {
    const userDocRef = doc(this.firestore, 'messageCounts', userId);
    onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        this.messageCountsArr = { ...snapshot.data() };
      } else {
        this.messageCountsArr = {};
      }
    });
  }

  async getAllUsers() {
    const usersCollection = collection(this.firestore, 'users');
    onSnapshot(usersCollection, (snapshot) => {
      this.allUsers = [];
      this.checkUsersExsists = false;

      snapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        if (doc.id !== this.userId && this.isValidUser(userData)) {
          this.allUsers.push(userData);
          this.checkUsersExsists = true;
        }
      });
    });
  }

  private isValidUser(user: any): boolean {
    return !!(user.name && user.picture && user.status);
  }

  selectChannel(channel: any) {
    this.selectedUser = null;
    this.selectedChannel = null;
    setTimeout(() => {
      this.selectedChannel = channel;
      this.channelSelected.emit(channel);
      this.global.channelSelected = true;
      this.global.currentThreadMessageSubject.next('');
      this.global.channelThreadSubject.next(null);
      this.global.setCurrentChannel(channel);
      this.openvollWidtChannelOrUserBox();
      this.hiddenVoolThreadBox();
      this.checkWidtSize();
      this.cheackChatOpen();
    });
  }

  toggleChannelDrawer() {
    this.channelDrawerOpen = !this.channelDrawerOpen;
  }
  toggleMessageDrawer() {
    this.messageDrawerOpen = !this.messageDrawerOpen;
  }

  isUserChanged(userOrChannel: any, isChannel: boolean): boolean {
    if (isChannel) {
      return false;
    }
    return userOrChannel.id !== this.selectedUser?.id;
  }

  setUser(userOrChannel: any): void {
    this.selectedUser = userOrChannel;
    if (this.selectedUser && this.selectedUser.id) {
      this.selectUser(this.selectedUser);
      const foundUser = this.allUsers.find(
        (user: { id: any }) => user.id === this.selectedUser.id
      );
      if (foundUser) {
        this.selectedUser = foundUser;
      }
    } else {
      console.error('selectedUser is null or undefined:', this.selectedUser);
    }
  }

  setChannel(userOrChannel: any): void {
    this.selectedChannel = userOrChannel;
    this.selectChannel(this.selectedChannel);
  }

  enterByUsername(userOrChannel: any, isChannel: boolean = false) {
    if (isChannel && (!userOrChannel || !userOrChannel.name)) {
      console.warn('Invalid channel passed to enterByUsername. Aborting.');
      return;
    }
    this.selectedChannel = isChannel ? userOrChannel : null;
    if (this.isUserChanged(userOrChannel, isChannel)) {
      this.setUser(userOrChannel);
    }
    if (isChannel) {
      this.setChannel(userOrChannel);
      this.selectChannel(userOrChannel);
    }
  }
}
