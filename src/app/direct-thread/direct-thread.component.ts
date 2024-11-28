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
  where,
  updateDoc,
  addDoc,
  getDocs,
  orderBy,
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

interface Reaction {
  emoji: string;
  count: number;
}

@Component({
  selector: 'app-direct-thread',
  standalone: true,
  imports: [CommonModule, PickerComponent, InputFieldComponent],
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
  subscription?: Subscription;
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
  isDirectThreadOpen: boolean = false;
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
      console.log('selectedUser is', this.selectedUser);
      await this.subscribeToChosenMessage();
      this.toggleThreadStatus(true);
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

  async subscribeToChosenMessage() {
    this.subscription = this.global.currentThreadMessage$.subscribe(
      async (message) => {
        await this.handleFirstThreadMessageAndPush(message);
        await this.getThreadMessages(message);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  async handleFirstThreadMessageAndPush(messageId: string) {
    try {
      const docRef = doc(this.firestore, 'messages', messageId);
      const docSnapshot = await getDoc(docRef);
  
      if (!docSnapshot.exists()) {
        console.error('Das Dokument existiert nicht.');
        return;
      }
  
      this.currentThreadMessage = docSnapshot.data();
      console.log('Aktuelle Nachricht:', this.currentThreadMessage);
      this.firstThreadMessage = true;
  
      // Erstelle Subcollection für die Thread-Nachrichten
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
        text: this.currentThreadMessage.text || '', // Nachrichtentext
      };
  
      await addDoc(threadMessagesRef, messageData);
      console.log('Neue Nachricht hinzugefügt.');
  
      // Eingabefelder zurücksetzen
      this.chatMessage = '';
      this.selectFiles = [];
  
      // Nach dem Hinzufügen Nachrichten abrufen
      await this.getThreadMessages(messageId);
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Thread-Nachricht:', error);
    }
  }
  

  async getThreadMessages(messageId: string) {
    try {
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${messageId}/threadMessages`
      );
      const q = query(threadMessagesRef, orderBy('timestamp', 'asc')); // Nachrichten sortieren nach Zeitstempel

      onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
          console.log('Keine Thread-Nachrichten gefunden.');
          this.messagesData = [];
          return;
        }

        console.log('Thread-Nachrichten abgerufen:', querySnapshot.size);
        this.messagesData = querySnapshot.docs.map((doc) => {
          const messageData = doc.data();
          if (messageData['timestamp'] && messageData['timestamp'].toDate) {
            messageData['timestamp'] = messageData['timestamp'].toDate();
          }
          return { id: doc.id, ...messageData };
        });

        console.log('Thread-Nachrichten:', this.messagesData);
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Thread-Nachrichten:', error);
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
