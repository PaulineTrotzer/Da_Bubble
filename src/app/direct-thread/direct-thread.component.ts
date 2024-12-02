import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { GlobalVariableService } from '../services/global-variable.service';
import { User } from '../models/user.class';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  addDoc,
  orderBy,
  setDoc
} from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { OverlayStatusService } from '../services/overlay-status.service';
import { Subscription } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ThreadControlService } from '../services/thread-control.service';
import { FirstMessageThreadComponent } from '../first-message-thread/first-message-thread.component';

interface Reaction {
  emoji: string;
  count: number;
}

@Component({
  selector: 'app-direct-thread',
  standalone: true,
  imports: [
    CommonModule,
    PickerComponent,
    InputFieldComponent,
    FirstMessageThreadComponent,
  ],
  templateUrl: './direct-thread.component.html',
  styleUrl: './direct-thread.component.scss',
  animations: [
    trigger('slideFromRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(50%)' }),
        animate(
          '125ms ease-in-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '125ms ease-in-out',
          style({ opacity: 0, transform: 'translateX(50%)' })
        ),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('125ms ease-in-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('125ms ease-in-out', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class DirectThreadComponent implements OnInit {
  @Output() closeDirectThread = new EventEmitter<void>();
  chatMessage: string = '';
  showUserBubble: boolean = false;
  global = inject(GlobalVariableService);
  currentUser: User = new User();
  firestore = inject(Firestore);
  userService = inject(UserService);
  @Input() selectedUser: any;
  userID: any | null = null;
  messagesData: any[] = [];
  showOptionBar = false;
  isHovered = false;
  isEmojiPickerVisible = false;
  currentSrc?: string;
  icons: { [key: string]: string } = {
    iconMore: 'assets/img/more_vertical.svg',
    iconAddReaction: 'assets/img/comment/add_reaction.svg',
    iconThird: 'assets/img/third.svg',
  };
  isDirectThreadOpen: boolean = true;
  overlayStatusService = inject(OverlayStatusService);
  reactions: { [messageId: string]: Reaction[] } = {};
  currentThreadMessage: {
    id?: string | undefined;
    senderName?: string;
    recipientName?: string;
    text?: string;
    senderPicture?: string;
    timestamp?: Date | { seconds: number; nanoseconds: number };
    senderId?: string;
    isHovered?: boolean;
  } = {};
  firstMessageId: string = '';
  firstThreadMessage = false;
  selectFiles: any[] = [];
  threadControlService = inject(ThreadControlService);
  @Output() firstThreadMessageId: string | null = null;
  private subscription = new Subscription();

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.userID = paramMap.get('id');
      if (this.userID) {
        const userResult = await this.userService.getUser(this.userID);
        if (userResult) {
          this.currentUser = userResult;
        }
      }
      this.threadControlService.firstThreadMessageId$.subscribe(
        async (messageId) => {
            await this.handleFirstThreadMessageAndPush(messageId);
            await this.getThreadMessages(messageId);
        }
      );
    });
  }

  toggleThreadStatus(status: boolean) {
    this.isDirectThreadOpen = status;
  }

  getFormattedTimestamp(): Date | null {
    if (!this.currentThreadMessage?.timestamp) {
      return null;
    }
    const timestamp = this.currentThreadMessage.timestamp;
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (
      typeof timestamp === 'object' &&
      'seconds' in timestamp &&
      'nanoseconds' in timestamp
    ) {
      return new Date(
        timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000
      );
    }
    return null;
  }

  shouldDisplayMessage(message: any, isFirstThreadMessage: boolean): boolean {
    if (
      isFirstThreadMessage &&
      message.senderName === this.currentThreadMessage.senderName
    ) {
      return true;
    }
    if (
      !isFirstThreadMessage &&
      message.senderName === this.selectedUser.name
    ) {
      return true;
    }
    return false;
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  async handleFirstThreadMessageAndPush(messageId: any) {
    try {
      const docRef = doc(this.firestore, 'messages', messageId);
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        const docData = docSnapshot.data();
        if (docData?.['firstMessageCreated']) {
          console.log('Die erste Nachricht wurde bereits erstellt.');
          return;
        }
      }
      this.currentThreadMessage = {
        id: docSnapshot.id,
        ...docSnapshot.data(),
      };
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${messageId}/threadMessages`
      );
      const messageData = {
        senderId: this.global.currentUserData.id,
        senderName: this.global.currentUserData.name,
        senderPicture: this.global.currentUserData.picture || '',
        timestamp: new Date(),
        selectedFiles: this.selectFiles || [],
        editedTextShow: false,
        recipientId: this.selectedUser.uid,
        recipientName: this.selectedUser.name,
        text: this.currentThreadMessage.text || '',
      };
        await addDoc(threadMessagesRef, messageData);
        console.log('Neue Nachricht hinzugefügt.');
        await setDoc(docRef, { firstMessageCreated: true }, { merge: true });
      this.chatMessage = '';
      this.selectFiles = [];
      await this.getThreadMessages(messageId);
    } catch (error) {
      console.error('fehler der Thread-Nachricht:', error);
    }
  }


  async getThreadMessages(messageId: any) {
    try {
      this.threadControlService.getReplyCount(messageId);
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${messageId}/threadMessages`
      );
      const q = query(threadMessagesRef, orderBy('timestamp', 'asc')); 
      onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
          console.log('keine thread-Nachrichten gefunden');
          this.messagesData = [];
          return;
        }
        this.messagesData = querySnapshot.docs.map((doc) => {
          const messageData = doc.data();
          if (messageData['timestamp'] && messageData['timestamp'].toDate) {
            messageData['timestamp'] = messageData['timestamp'].toDate();
          }
          return { id: doc.id, ...messageData };
        });
      });
    } catch (error) {
      console.error('fehler getMessagws', error);
    }
  }

  onHover(iconKey: string, newSrc: string): void {
    this.icons[iconKey] = newSrc;
  }

  openEmojiPicker() {
    this.isEmojiPickerVisible = true;
    this.overlayStatusService.setOverlayStatus(true);
  }

  closePicker() {
    this.overlayStatusService.setOverlayStatus(false);
    this.isEmojiPickerVisible = false;
  }

  async addEmoji(event: any, messageId: string) {
    const emoji = event.emoji.native;
    if (!this.reactions[messageId]) {
      this.reactions[messageId] = [];
    }
    const existingReaction = this.reactions[messageId].find(
      (reaction) => reaction.emoji === emoji
    );
    if (existingReaction) {
      existingReaction.count += 1;
    } else {
      this.reactions[messageId].push({ emoji, count: 1 });
    }
    await this.addingEmojiToMessage(messageId, emoji);
    this.isEmojiPickerVisible = false;
    this.overlayStatusService.setOverlayStatus(false);
  }

  async addingEmojiToMessage(messageId: string, emoji: string) {
    if (messageId) {
      this.updateMessageInDatabase(emoji, messageId);
    }
  }

  async updateMessageInDatabase(emoji: any, messageId: any) {
    const emojiRef = doc(this.firestore, 'messages', messageId);
    updateDoc(emojiRef, {
      senderSticker: emoji,
      senderStickerCount:
        messageId.senderSticker === emoji
          ? messageId.senderStickerCount + 1
          : 1,
    })
      .then(() => {
        console.log('Nachricht erfolgreich aktualisiert');
      })
      .catch((error) => {
        console.error('Fehler beim Aktualisieren der Nachricht:', error);
      });
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
        this.userService.observingUserChanges(userId, (updatedUser: User) => {
          this.selectedUser = updatedUser;
        });
      }
    } catch (error) {
      console.error('Fehler beim Abruf s Benutzers:', error);
    }
  }

  messageData(
    senderStickerCount: number,
    recipientStickerCount: number
  ): SendMessageInfo {
    let recipientId = this.selectedUser.id;
    let recipientName = this.selectedUser.name;
    return {
      text: this.chatMessage,
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      recipientId,
      recipientName,
      timestamp: new Date(),
      senderSticker: '',
      senderStickerCount: senderStickerCount || 1,
      recipientSticker: '',
      recipientStickerCount: recipientStickerCount || 1,
      senderchoosedStickereBackColor: '',
      recipientChoosedStickerBackColor: '',
      stickerBoxCurrentStyle: null,
      stickerBoxOpacity: null,
      selectedFiles: [],
    };
  }

  onMouseEnter(message: any) {
    message.isHovered = true;
  }

  onMouseLeave(message: any) {
    message.isHovered = false;
  }

  onClose() {
    this.toggleThreadStatus(false);
    this.closeDirectThread.emit();
  }
}
