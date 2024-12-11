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
import { CommonModule } from '@angular/common';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { OverlayStatusService } from '../services/overlay-status.service';
import { firstValueFrom, Subscription, first, BehaviorSubject } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ThreadControlService } from '../services/thread-control.service';
import { Emoji } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {
  slideFromRight,
  fadeIn,
} from './../../assets/direct-thread.animations';
import { currentThreadMessage } from '../models/threadMessage.class';

@Component({
  selector: 'app-direct-thread',
  standalone: true,
  imports: [CommonModule, PickerComponent, InputFieldComponent],
  templateUrl: './direct-thread.component.html',
  styleUrl: './direct-thread.component.scss',
  animations: [slideFromRight, fadeIn],
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
  showOptionBar: { [key: string]: boolean } = {};
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
  selectFiles: any[] = [];
  threadControlService = inject(ThreadControlService);
  subscription = new Subscription();
  shouldScrollToBottom = false;
  firstInitialisedThreadMsg: string | null = null;
  currentThreadMessage!: currentThreadMessage;
  showReactionPopUpSender: { [key: string]: boolean } = {};
  showReactionPopUpRecipient: { [key: string]: boolean } = {};
  showReactionPopUpBoth = false;
  isMouseInside: any;
  firstThreadValue: string | null = null;
  currentUserId: string | null = null;

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.initializeUser();
    this.subscribeToThreadMessages();
    this.scrollToBottom();
    this.initializeFirstThreadMsg();
    this.currentUserId = this.route.snapshot.paramMap.get('id');
    console.log('selectedUSr',this.selectedUser);
  }

  initializeFirstThreadMsg() {
    this.threadControlService.firstThreadMessageId$
      .pipe(first())
      .subscribe((id) => {
        this.firstThreadValue = id;
      });
  }


  hasCurrentMessage(message: any) {
    return message.senderId === this.currentUserId;
  }

  toggleOptionBar(messageId: string, status: boolean): void {
    this.showOptionBar[messageId] = status;
  }

  toggleReactionInfoSender(messageId: string, status: boolean): void {
    console.log('Toggle reaction info for sender', messageId, 'show:', status);
    this.showReactionPopUpSender[messageId] = status;
  }
  toggleReactionInfoRecipient(messageId: string, status: boolean): void {
    this.showReactionPopUpRecipient[messageId] = status;
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

  getUserIds(reactions: {
    [key: string]: { emoji: string; counter: number };
  }): string[] {
    return Object.keys(reactions);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  isLeftReactions(message: any): boolean {
    return message.senderId === this.selectedUser?.uid;
  }
  async initializeUser() {
    this.route.paramMap.subscribe(async (paramMap) => {
      const userID = paramMap.get('id');
      if (userID) {
        await this.loadCurrentUser(userID);
      }
    });
  }
  toggleBothReactionInfo(show: boolean): void {
    this.showReactionPopUpBoth = show;
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
      reactions: '',
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
        console.log(querySnapshot.docs.map((doc) => doc.data()));
        this.messagesData = querySnapshot.docs.map((doc) => {
          const messageData = doc.data();
          if (messageData['timestamp'] && messageData['timestamp'].toDate) {
            messageData['timestamp'] = messageData['timestamp'].toDate();
          }
          return {
            id: doc.id,
            ...messageData,
          };
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
  async addEmoji(event: any, currentMessageId: string, userId: string) {
    const emoji = event.emoji.native;
  
    // Referenz zur Nachricht
    let threadMessageRef = doc(
      this.firestore,
      `messages/${currentMessageId}/threadMessages/${currentMessageId}`
    );
  
    // Falls die erste Thread-Nachricht noch nicht gesetzt ist, hole sie von der entsprechenden Quelle
    if (!this.firstThreadValue) {
      const firstInitialisedThreadMsg = await firstValueFrom(
        this.threadControlService.firstThreadMessageId$
      );
      threadMessageRef = doc(
        this.firestore,
        `messages/${firstInitialisedThreadMsg}/threadMessages/${currentMessageId}`
      );
    }
  
    if (this.firstThreadValue) {
      threadMessageRef = doc(
        this.firestore,
        `messages/${this.firstThreadValue}/threadMessages/${currentMessageId}`
      );
    }
  
    // Hole die Nachricht aus Firestore
    const threadMessageDoc = await getDoc(threadMessageRef);
    if (!threadMessageDoc.exists()) {
      console.error('Thread message nicht gefunden.');
      return;
    }
  
    const threadMessageData = threadMessageDoc.data();
    if (!threadMessageData['reactions']) {
      threadMessageData['reactions'] = {};
    }
  
    // Überprüfen, ob der User schon auf die Nachricht reagiert hat
    const userReaction = threadMessageData['reactions'][userId];
    if (userReaction && userReaction.emoji === emoji) {
      // Reaktion umkehren (wenn der gleiche Emoji erneut geklickt wird, zähle die Reaktion zurück)
      threadMessageData['reactions'][userId].counter = userReaction.counter === 0 ? 1 : 0;
    } else {
      // Reaktion neu setzen oder ersetzen
      threadMessageData['reactions'][userId] = {
        emoji: emoji,
        counter: 1,
      };
    }
  
    // Sicherstellen, dass für den Sender und Empfänger jeweils eine Reaktion existiert
    const senderId = threadMessageData['senderId'];
    const recipientId = threadMessageData['recipientId'];
  
    // Wenn der Sender keine Reaktion hat, lege eine leere Reaktion an
    if (senderId && !threadMessageData['reactions'][senderId]) {
      threadMessageData['reactions'][senderId] = { emoji: "", counter: 0 };
    }
  
    // Wenn der Empfänger keine Reaktion hat, lege eine leere Reaktion an
    if (recipientId && !threadMessageData['reactions'][recipientId]) {
      threadMessageData['reactions'][recipientId] = { emoji: "", counter: 0 };
    }
  
    // Reaktionen in Firestore aktualisieren
    await updateDoc(threadMessageRef, {
      reactions: threadMessageData['reactions'],
    });
  }
  


  TwoReactionsTwoEmojis(recipientId: any, senderId: any): boolean {
    if (recipientId?.counter > 0 && senderId?.counter > 0) {
      return true;
    }
    if (!recipientId?.counter || !senderId?.counter) {
      return false;
    }
    return false;
  }

  
  getSenderReaction(reactions: any): any | null {
    const reactionsArray = Array.isArray(reactions) ? reactions : Object.values(reactions || {});
    console.log('Sender reactions (as Array):', reactionsArray);
    return reactionsArray.find(reaction => reaction.senderId === this.currentUser.uid) || null;
}

getRecipientReaction(reactions: any): any | null {
    const reactionsArray = Array.isArray(reactions) ? reactions : Object.values(reactions || {});
    console.log('Recipient reactions (as Array):', reactionsArray);
    return reactionsArray.find(reaction => reaction.recipientId === this.currentUser.uid) || null;
}

  areEmojisSame(reactions: any): boolean {
    const userIds = this.getUserIds(reactions);
    if (userIds.length < 2) return false;
    const firstEmoji = reactions[userIds[0]]?.emoji;
    const secondEmoji = reactions[userIds[1]]?.emoji;
    return firstEmoji === secondEmoji;
  }

  getCounterFromFirstUser(reactions: any): number | null {
    const userIds = this.getUserIds(reactions);
    return userIds.length > 0 ? reactions[userIds[0]]?.counter : null;
  }

  getEmojiFromFirstUser(reactions: any): string | null {
    const userIds = this.getUserIds(reactions);
    return userIds.length > 0 ? reactions[userIds[0]]?.emoji : null;
  }

  getTotalCounterForSameEmoji(reactions: any): number {
    if (!reactions) return 0;
    const userIds = this.getUserIds(reactions);
    if (userIds.length < 2) return 0;
    const firstEmoji = reactions[userIds[0]]?.emoji;
    return userIds.reduce((total, userId) => {
      if (reactions[userId]?.emoji === firstEmoji) {
        return total + (reactions[userId]?.counter || 0);
      }
      return total;
    }, 0);
  }

  handlingExistingUserReaction(
    threadMessageId: string,
    userId: string,
    emoji: Emoji
  ) {
    const userReaction = this.reactions[threadMessageId].find((reaction) =>
      reaction.userIds.includes(userId)
    );
    if (userReaction) {
      userReaction.count--;
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
        if (!reactions[userId]) {
          reactions[userId] = { emoji: null, counter: 0 };
        }
        const otherUserId = Object.keys(reactions).find(
          (id) => id !== userId && reactions[id]?.emoji === emoji
        );
        if (otherUserId) {
          reactions[userId].emoji = emoji;
          reactions[userId].counter = 2;
        } else {
          reactions[userId].emoji = emoji;
          reactions[userId].counter = 1;
        }
        await updateDoc(emojiDocRef, {
          reactions: reactions,
        });
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
    this.global.currentThreadMessageSubject.next(null);
  }
}
