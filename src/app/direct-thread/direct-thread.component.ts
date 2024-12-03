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
  increment,
  getDocs,
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
  @ViewChild('messageContainer') messageContainer!: ElementRef;
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
    reactions?: {
      [emoji: string]: {
        count: number;
        userIds: string[];
      };
    };
  } = {};
  firstThreadMessage = false;
  selectFiles: any[] = [];
  threadControlService = inject(ThreadControlService);
  @Output() firstThreadMessageId: string | null = null;
  subscription = new Subscription();
  shouldScrollToBottom = false;
  parentMessageId: string | null = null;

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeUser();
    this.subscribeToThreadMessages();
    this.scrollToBottom();
  }
  

  async loadReactionsAndRender(parentMessageId: string) {
    try {
      // Holen der Thread-Nachrichten aus Firestore
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${parentMessageId}/threadMessages`
      );
      const querySnapshot = await getDocs(threadMessagesRef);

      querySnapshot.forEach(async (doc) => {
        const threadMessageId = doc.id;
        const data = doc.data();

        if (data && data['senderSticker'] && data['senderStickerCount']) {
          // Beispielhafte Benutzer-ID; dies sollte ersetzt werden, um die tatsächliche Benutzer-ID zu verwenden
          const userId = 'exampleUserId'; // Die Benutzer-ID muss hier korrekt gesetzt werden
          await this.addEmoji(
            { emoji: { native: data['senderSticker'] } },
            threadMessageId,
            userId
          );
        }
      });
    } catch (error) {
      console.error('Fehler beim Laden der Reaktionen:', error);
    }
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
      async (parentMessageId) => {
        if (parentMessageId) {
          await this.processThreadMessages(parentMessageId);
        }
      }
    );
  }

  async processThreadMessages(parentMessageId: string) {
    this.parentMessageId = parentMessageId;
    if (this.parentMessageId) {
      await this.handleFirstThreadMessageAndPush(this.parentMessageId);
      await this.loadReactionsAndRender(this.parentMessageId);
      await this.getThreadMessages(this.parentMessageId);
    }
  }

  async loadReactions(messageId: string): Promise<void> {
    debugger;
    try {
      const reactionsRef = collection(
        this.firestore,
        `messages/${messageId}/reactions`
      );

      const querySnapshot = await getDocs(reactionsRef);

      if (!querySnapshot.empty) {
        const reactions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Speichern der Reaktionen in einer zentralen Struktur
        this.reactions[messageId] = reactions;
      }
    } catch (error) {
      console.error(
        `Fehler beim Laden der Reaktionen für Nachricht ${messageId}:`,
        error
      );
    }
  }

  processReaction(doc: any) {
    const data = doc.data();
    const threadMessageId = doc.id;
    const reactionList = this.reactions[threadMessageId] || [];
    if (data['senderSticker']) {
      const existingReaction = reactionList.find(
        (reaction) => reaction.emoji === data['senderSticker']
      );
      if (existingReaction) {
        existingReaction.count += data['senderStickerCount'] || 1;
      } else {
        reactionList.push({
          emoji: data['senderSticker'],
          count: data['senderStickerCount'] || 1,
          userIds: [],
        });
      }
      this.reactions[threadMessageId] = reactionList;
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

  async handleFirstThreadMessageAndPush(messageId: any) {
    try {
      const docRef = doc(this.firestore, 'messages', messageId);
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
  
      // Setze das Attribut `firstMessageCreated` auf `true` bevor die Nachricht hinzugefügt wird
      await setDoc(docRef, { firstMessageCreated: true }, { merge: true });
  
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
        recipientStickerCount: 0,
        recipientSticker: '',
        text: this.currentThreadMessage.text || '',
      };
      await addDoc(threadMessagesRef, messageData);
      this.chatMessage = '';
      this.selectFiles = [];
      await this.getThreadMessages(messageId);
    } catch (error) {
      console.error('Fehler der Thread-Nachricht:', error);
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
        console.log('ThreadMessages Snapshot:', querySnapshot.docs);
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

  async addEmoji(event: any, threadMessageId: string, userId: string) {
    const emoji = event.emoji.native;
    const parentMessageId = await firstValueFrom(
      this.threadControlService.firstThreadMessageId$
    );
    if (!parentMessageId) {
      console.error('ParentMessageId ist nicht verfügbar.');
      return;
    }
  
    // Sicherstellen, dass der threadMessageId-Eintrag existiert
    this.reactions[threadMessageId] = this.reactions[threadMessageId] || [];
  
    // Überprüfen, ob der Benutzer bereits eine Reaktion für diese Nachricht hat
    const userReaction = this.reactions[threadMessageId].find((reaction) =>
      reaction.userIds.includes(userId)
    );
  
    if (userReaction) {
      if (userReaction.emoji === emoji) {
        console.log('Benutzer hat bereits mit diesem Emoji reagiert.');
        return; // Der Benutzer hat bereits mit diesem Emoji reagiert, keine Änderungen nötig
      }
  
      // Wenn der Benutzer eine andere Reaktion hat, aktualisiere sie
      userReaction.count--;
      userReaction.userIds = userReaction.userIds.filter((id: string) => id !== userId);
  
      if (userReaction.count === 0) {
        // Entferne die Reaktion, falls der Benutzer sie nicht mehr verwendet
        this.reactions[threadMessageId] = this.reactions[threadMessageId].filter(
          (reaction) => reaction !== userReaction
        );
      }
    }
  
    // Neue Reaktion hinzufügen oder bestehende aktualisieren
    let existingReaction = this.reactions[threadMessageId].find(
      (reaction) => reaction.emoji === emoji
    );
  
    if (existingReaction) {
      if (!existingReaction.userIds.includes(userId)) {
        // Füge die Benutzer-ID hinzu und erhöhe den Zähler, wenn der Benutzer noch nicht vorhanden ist
        if (existingReaction.count < 2) {
          existingReaction.count++;
          existingReaction.userIds.push(userId);
        }
      }
    } else {
      // Neue Reaktion hinzufügen
      this.reactions[threadMessageId].push({
        emoji,
        count: 1,
        userIds: [userId],
      });
    }
  
    // Datenbank aktualisieren
    await this.addingEmojiToMessage(parentMessageId, threadMessageId, emoji);
    this.isEmojiPickerVisible = false;
    this.overlayStatusService.setOverlayStatus(false);
  }
  
  

  async addingEmojiToMessage(
    parentMessageId: string,
    threadMessageId: string,
    emoji: string
  ) {
    if (parentMessageId && threadMessageId) {
      await this.updateMessageInDatabase(
        parentMessageId,
        threadMessageId,
        emoji
      );
    }
  }

  async updateMessageInDatabase(
    parentMessageId: string,
    threadMessageId: string,
    emoji: string
  ) {
    try {
      const emojiDocRef = doc(
        this.firestore,
        `messages/${parentMessageId}/threadMessages/${threadMessageId}`
      );
      await updateDoc(emojiDocRef, {
        senderSticker: emoji,
        senderStickerCount: increment(1),
      });
      console.log('Emoji erfolgreich hinzugefügt.');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Nachricht:', error);
    }
  }

  messageData(): SendMessageInfo {
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
