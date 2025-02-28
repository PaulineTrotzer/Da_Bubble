import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  Output,
  EventEmitter,
  ElementRef,
  HostListener,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  collection,
  Firestore,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  arrayRemove,
  arrayUnion,
  setDoc,
} from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../services/user.service';
import { DialogHeaderDropdownComponent } from '../dialog-header-dropdown/dialog-header-dropdown.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { OverlayStatusService } from '../services/overlay-status.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    DialogHeaderDropdownComponent,
    MatMenuModule,
    MatButtonModule,
    CommonModule,
    FormsModule,
    MatCardModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  firestore = inject(Firestore);
  user: User = new User();
  userID: any;
  userservice = inject(UserService);
  clicked = false;
  unsub?: () => void;
  overlayOpen = false;
  private overlayStatusSub!: Subscription;
  searcheNameOrChannel: string = '';
  showUserList: boolean = false;
  showChannelList: boolean = false;
  showMessageList: boolean = false;
  listlastResultResult: boolean = false;
  getAllUsersCollection: any[] = [];
  filteredUsers: any[] = [];
  noUserFounded: boolean = false;
  userIdHover: string = '';
  getChannels: any[] = []; 
  filterChannel: any[] = [];
  noChannelFounded: boolean = false;
  channelIdHover: string = '';
  allPrivateMessages: any[] = [];
  filteredMessages: any[] = [];
  getSeperateUser: any = {};
  hoverResultnameId: string = '';
  hoverResultChannelId: string = '';
  auth = inject(AuthService);
  global = inject(GlobalVariableService);
  overlayStatusService = inject(OverlayStatusService);
  overlay = inject(OverlayStatusService);

  @Output() headerUserSelected = new EventEmitter<any>();
  @Output() headerChannelSelcted = new EventEmitter<any>();

  constructor(private route: ActivatedRoute, private eRef: ElementRef) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.userID = paramMap.get('id');
      if (this.userID) {
        this.getUser(this.userID);
        const userResult = await this.userservice.getUser(this.userID);
        if (userResult) {
          this.user = userResult;
          this.userservice.observingUserChanges(
            this.userID,
            (updatedUser: User) => {
              this.user = updatedUser;
            }
          );
        }
      }
    });
    this.subscribeOverlayService();
    this.getAllUsers();
    this.getAllChannels();
    this.getAllPrivateMessages();
  }

  subscribeOverlayService() {
    this.overlayStatusSub = this.overlayStatusService.overlayStatus$.subscribe(
      (status) => {
        this.overlayOpen = status;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.unsub) {
      this.unsub();
    }
    if (this.overlayStatusSub) {
      this.overlayStatusSub.unsubscribe();
    }
  }

  toggleDropDown() {
    this.clicked = !this.clicked;
    this.overlayStatusService.setOverlayStatus(this.clicked);
  }

  onOverlayClosed() {
    this.overlayOpen = false;
    this.clicked = false;
  }

  @HostListener('document:click', ['$event'])
  closeDropdowns(event: MouseEvent): void {
    const clickedElement = event.target as HTMLElement;
    if (
      clickedElement.closest('.mainSearch-box') ||
      clickedElement.closest('input') ||
      clickedElement.closest('.overlay')
    ) {
      return;
    }
    this.showUserList = false;
    this.showChannelList = false;
    this.showMessageList = false;
    this.listlastResultResult = false;
    this.searcheNameOrChannel = '';
  }

  handleFocus(): void {
    this.listlastResultResult = true;
  }

  checkInputValue() {
    const trimmed = this.searcheNameOrChannel.trim();
    if (trimmed.startsWith('@') && trimmed !== '') {
      // > USER-SUCHE
      this.showUserList = true;
      this.showChannelList = false;
      this.showMessageList = false;
      this.filterUsers();
    } else if (trimmed.startsWith('#') && trimmed !== '') {
      // > CHANNEL-SUCHE
      this.showUserList = false;
      this.showChannelList = true;
      this.showMessageList = false;
      this.filterChannels();
    } else {
      // > NACHRICHTEN-SUCHE (ChannelMessages + privateMessages)
      this.showUserList = false;
      this.showChannelList = false;
      this.filterMessages();
    }
  }

  getAllUsers() {
    const userRef = collection(this.firestore, 'users');
    onSnapshot(userRef, (querySnapshot) => {
      this.getAllUsersCollection = [];
      querySnapshot.forEach((docSnap) => {
        if (this.userID !== docSnap.id) {
          const allUsers = docSnap.data();
          this.getAllUsersCollection.push({ id: docSnap.id, ...allUsers });
        }
      });
      this.filterUsers();
    });
  }

  filterUsers() {
    const searchValue = this.searcheNameOrChannel
      .toLowerCase()
      .replace('@', '')
      .trim();

    this.filteredUsers = this.getAllUsersCollection.filter((user) => {
      if (user?.name && typeof user.name === 'string') {
        return user.name.toLowerCase().includes(searchValue);
      }
      return false;
    });
    this.noUserFounded = this.filteredUsers.length === 0;
  }

  checkUserId(user: any) {
    this.userIdHover = user.id;
  }
  leaveUserId() {
    this.userIdHover = '';
  }

  async enterChatUser(user: any) {
    const channelRef = doc(this.firestore, 'searchHeaderResult', this.userID);
    await setDoc(
      channelRef,
      { searchHeaderResult: arrayUnion(user) },
      { merge: true }
    );
    this.headerUserSelected.emit(user);
    this.showUserList = false;
    this.searcheNameOrChannel = '';
    this.listlastResultResult = false;
    this.hoverResultnameId = '';
  }

  async getAllChannels() {
    const channelRef = collection(this.firestore, 'channels');
    onSnapshot(channelRef, async (querySnapshot) => {
      const loadedChannels: any[] = [];
      for (const docSnap of querySnapshot.docs) {
        const channelData = docSnap.data();
        const channelId = docSnap.id;
        const channel: any = { id: channelId, ...channelData, messages: [] };
        const messagesRef = collection(
          this.firestore,
          'channels',
          channelId,
          'messages'
        );
        const messagesSnapshot = await getDocs(messagesRef);
        messagesSnapshot.forEach((messageDoc) => {
          channel.messages.push({ id: messageDoc.id, ...messageDoc.data() });
        });

        loadedChannels.push(channel);
      }
      this.getChannels = loadedChannels.filter(
        (chan) => chan.userIds && chan.userIds.includes(this.userID)
      );
    });
  }

  filterChannels() {
    const searchChannel = this.searcheNameOrChannel
      .toLowerCase()
      .replace('#', '')
      .trim();

    this.filterChannel = this.getChannels.filter((channel) =>
      channel.name.toLowerCase().includes(searchChannel)
    );
    this.noChannelFounded = this.filterChannel.length === 0;
  }

  checkChannelId(channel: any) {
    this.channelIdHover = channel.id;
  }

  leaveChannelId() {
    this.channelIdHover = '';
  }

  async enterChannel(channel: any) {
    const channelRef = doc(this.firestore, 'searchHeaderResult', this.userID);
    await setDoc(
      channelRef,
      { searchHeaderResult: arrayUnion(channel) },
      { merge: true }
    );
    this.headerChannelSelcted.emit(channel);
    this.showChannelList = false;
    this.searcheNameOrChannel = '';
    this.listlastResultResult = false;
  }


  async getAllPrivateMessages() {
    const privateMessagesRef = collection(this.firestore, 'messages');
    onSnapshot(privateMessagesRef, (querySnapshot) => {
      const loadedPrivateMessages: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const msgData = docSnap.data();
        loadedPrivateMessages.push({ id: docSnap.id, ...msgData });
      });
      this.allPrivateMessages = loadedPrivateMessages.filter(
        (pmsg) =>
          pmsg.senderId === this.userID || pmsg.recipientId === this.userID
      );
    });
  }

  filterMessages() {
    const searchTerm = this.searcheNameOrChannel.toLowerCase().trim();
    if (!searchTerm) {
      this.filteredMessages = [];
      this.showMessageList = false;
      return;
    }

    const results: any[] = [];
    for (const channel of this.getChannels) {
      for (const msg of channel.messages) {
        if (
          msg.text &&
          msg.text.toLowerCase().includes(searchTerm) &&
          msg.senderId === this.userID
        ) {
          results.push({
            isChannel: true,
            channelName: channel.name,
            messageText: msg.text,
            senderId: msg.senderId || null,
            timestamp: msg.timestamp || null,
          });
        }
      }
    }


    for (const pmsg of this.allPrivateMessages) {
      if (
        pmsg.text &&
        pmsg.text.toLowerCase().includes(searchTerm) &&
        pmsg.senderId === this.userID
      ) {
        results.push({
          isChannel: false,
          recipientId: pmsg.recipientId || null,
          recipientName: pmsg.recipientName || null,
          senderId: pmsg.senderId || null,
          senderName: pmsg.senderName || null,
          messageText: pmsg.text,
          timestamp: pmsg.timestamp || null,
        });
      }
    }

    this.filteredMessages = results;
    this.showMessageList = this.filteredMessages.length > 0;
  }


  getUser(currentId: any) {
    const docRef = doc(this.firestore, 'searchHeaderResult', currentId);
    if (!this.userID) {
      return;
    }
    onSnapshot(docRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const id = docSnapshot.id;
        this.getSeperateUser = { id: id, ...data };
      } else {
        this.getSeperateUser = {};
      }
    });
  }

  checkuserResultId(user: any) {
    this.hoverResultnameId = user.id;
  }
  leaveCheckuserResultId() {
    this.hoverResultnameId = '';
  }

  checkChannelResultId(channel: any) {
    this.hoverResultChannelId = channel.id;
  }
  leaveCheckChannelResultId() {
    this.hoverResultChannelId = '';
  }

  deleteUser(user: any) {
    const docRef = doc(this.firestore, 'searchHeaderResult', this.userID);
    updateDoc(docRef, { searchHeaderResult: arrayRemove(user) });
  }
}
