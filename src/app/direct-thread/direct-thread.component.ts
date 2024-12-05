import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild,
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
  setDoc,
} from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { OverlayStatusService } from '../services/overlay-status.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ThreadControlService } from '../services/thread-control.service';
import { Emoji } from '@ctrl/ngx-emoji-mart/ngx-emoji';

interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
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
  @Output() closeDirectThread = new EventEmitter<void>();
  @Input() selectedUser: any;
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  chatMessage: string = '';
  showUserBubble: boolean = false;
  global = inject(GlobalVariableService);
  currentUser: User = new User();
  firestore = inject(Firestore);
  userService = inject(UserService);
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
  reactions: { [messageId: string]: any[] } = {};
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
  selectFiles: any[] = [];
  threadControlService = inject(ThreadControlService);
  subscription = new Subscription();
  shouldScrollToBottom = false;
  firstInitialisedThreadMsg: string | null = null;

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeUser();
    this.subscribeToThreadMessages();
    this.scrollToBottom();
  }

  getUserIds(reactions: { [key: string]: { emoji: string, counter: number } }): string[] {
    return Object.keys(reactions);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  initializeUser() {
    this.route.paramMap.subscribe(async (paramMap) => {
      const userID = paramMap.get('id');
      if (userID) {
        await this.loadCurrentUser(userID);
      }
    });
  }

  async loadCurrentUser(userID: string) {
    try {
      const userResult = await this.userService.getUser(userID);
      if (userResult) {
        this.currentUser = userResult;
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzers:', error);
    }
  }

  private subscribeToThreadMessages() {
    this.threadControlService.firstThreadMessageId$.subscribe(
      async (firstInitialisedThreadMsg) => {
        if (firstInitialisedThreadMsg) {
          await this.processThreadMessages(firstInitialisedThreadMsg);
        }
      }
    );
  }

  async processThreadMessages(firstInitialisedThreadMsg: string) {
    this.firstInitialisedThreadMsg = firstInitialisedThreadMsg;
    if (this.firstInitialisedThreadMsg) {
      await this.handleFirstThreadMessageAndPush(
        this.firstInitialisedThreadMsg
      );
      await this.getThreadMessages(this.firstInitialisedThreadMsg);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom() {
    if (this.messageContainer) {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
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

  async handleFirstThreadMessageAndPush(firstInitialisedThreadMsg: any) {
    try {
      const docRef = doc(this.firestore, 'messages', firstInitialisedThreadMsg);
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        const docData = docSnapshot.data();
        if (docData?.['firstMessageCreated']) {
          console.log('Die erste Nachricht wurde bereits erstellt.');
          this.currentThreadMessage = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          };
          return;
        }
      }
      await setDoc(docRef, { firstMessageCreated: true }, { merge: true });
      this.currentThreadMessage = {
        id: docSnapshot.id,
        ...docSnapshot.data(),
      };
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${firstInitialisedThreadMsg}/threadMessages`
      );
      this.settingDataforFireBase(threadMessagesRef);
    } catch (error) {
      console.error('Fehler der Thread-Nachricht:', error);
    }
  }

  settingDataforFireBase(threadMessagesRef: any) {
    const messageData = {
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      timestamp: new Date(),
      selectedFiles: this.selectFiles || [],
      editedTextShow: false,
      recipientId: this.selectedUser.uid,
      recipientName: this.selectedUser.name,
      recipientStickerCount: 0,
      recipientSticker: '',
      text: this.currentThreadMessage.text || '',
      reactions: ''
    };
    setTimeout(async () => {
      await addDoc(threadMessagesRef, messageData);
    }, 100);
  }

  async getThreadMessages(messageId: any) {
    try {
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${messageId}/threadMessages`
      );
      const q = query(threadMessagesRef, orderBy('timestamp', 'asc'));
      onSnapshot(q, (querySnapshot) => {
        console.log(
          'ThreadMessages Snapshot:',
          querySnapshot.docs.map((doc) => doc.data())
        );
        if (querySnapshot.empty) {
          console.log('Keine Thread-Nachrichten gefunden');
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
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
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

  async addEmoji(event: any, currentThreadMessageId: string, userId: string) {
    debugger;
    const emoji = event.emoji.native;
    const firstInitialisedThreadMsg = await firstValueFrom(
      this.threadControlService.firstThreadMessageId$
    );
  
    if (!firstInitialisedThreadMsg) {
      console.error('ParentMessageId ist nicht verfügbar.');
      return;
    }
  
    // Lese die aktuelle Nachricht aus der Datenbank
    const threadMessageRef = doc(this.firestore, `messages/${firstInitialisedThreadMsg}/threadMessages/${currentThreadMessageId}`);
    const threadMessageDoc = await getDoc(threadMessageRef);
  
    if (!threadMessageDoc.exists()) {
      console.error('Thread message nicht gefunden.');
      return;
    }
  
    const threadMessageData = threadMessageDoc.data();
  
    // Überprüfe, ob die Reaktion für dieses Emoji bereits vorhanden ist
    if (threadMessageData['reactions'] && threadMessageData['reactions'].emoji === emoji) {
      // Falls die Reaktion vorhanden ist, aktualisiere den Zähler und füge die Benutzer-ID hinzu
      if (!threadMessageData['reactions'].userId.includes(userId)) {
        // Benutzer-ID hinzufügen und Zähler erhöhen
        // Benutzer-ID hinzufügen und Zähler erhöhen
        threadMessageData['reactions'].counter++;
        threadMessageData['reactions'].userId.push(userId);
      }
    } else {
      // Wenn die Reaktion neu ist, setze sie auf die aktuelle Emoji-Reaktion
      await this.updateMessageInDatabase(firstInitialisedThreadMsg, currentThreadMessageId, this.currentUser.uid, emoji);
    }
    this.isEmojiPickerVisible = false;
    this.overlayStatusService.setOverlayStatus(false);
  }
  

  handlingExistingUserReaction(
    threadMessageId: string,
    userId: string,
    emoji: Emoji
  ) 
  {
    debugger;
    const userReaction = this.reactions[threadMessageId].find((reaction) =>
      reaction.userIds.includes(userId)
    );

    if (userReaction) {
      if (userReaction.emoji === emoji) {
        console.log('Benutzer hat bereits mit diesem Emoji reagiert.');
        return; // Der Benutzer hat bereits mit diesem Emoji reagiert
      }

      // Wenn der Benutzer eine andere Reaktion hat, aktualisiere sie
      userReaction.count--; // Zähler reduzieren
      userReaction.userIds = userReaction.userIds.filter(
        (id: string) => id !== userId
      );
    } else {
      const newReaction = {
        emoji,
        count: 1,
        userIds: [userId],
      };
      this.reactions[threadMessageId].push(newReaction);
    }
  }

  
  async updateMessageInDatabase(
    parentMessageId: string,
    threadMessageId: string,
    userId: string,
    emoji: string
  ) {
    try {
      const emojiDocRef = doc(
        this.firestore,
        `messages/${parentMessageId}/threadMessages/${threadMessageId}`
      );
  
      const docSnapshot = await getDoc(emojiDocRef);
      if (docSnapshot.exists()) {
        const currentData = docSnapshot.data();
        const reactions = currentData?.['reactions'] || {};
  
        // Wenn der Benutzer bereits eine Reaktion hat, aktualisiere den Emoji und den Zähler
        if (reactions[userId]) {
          reactions[userId].emoji = emoji;
          reactions[userId].counter = (reactions[userId].counter || 0) + 1;
        } else {
          // Wenn der Benutzer noch keine Reaktion hat, füge eine neue hinzu
          reactions[userId] = {
            emoji: emoji,
            counter: 1,
          };
        }
        // Aktualisiere das Dokument mit den neuen Reaktionen
        await updateDoc(emojiDocRef, {
          reactions: reactions,
        });
  
        console.log('Reaktionen erfolgreich aktualisiert.');
      } else {
        console.error(`Das Dokument für die Nachricht ${threadMessageId} existiert nicht.`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Reaktionen:', error);
    }
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
