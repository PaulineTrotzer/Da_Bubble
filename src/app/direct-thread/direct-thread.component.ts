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
  deleteDoc,
  DocumentReference,
} from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { OverlayStatusService } from '../services/overlay-status.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ThreadControlService } from '../services/thread-control.service';
import { Emoji } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { currentThreadMessage } from '../models/threadMessage.class';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { MentionMessageBoxComponent } from '../mention-message-box/mention-message-box.component';

@Component({
  selector: 'app-direct-thread',
  standalone: true,
  imports: [
    CommonModule,
    PickerComponent,
    InputFieldComponent,
    FormsModule,
    MatCardModule,
    MentionMessageBoxComponent,
  ],
  templateUrl: './direct-thread.component.html',
  styleUrls: ['./direct-thread.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out', style({ opacity: 1 })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-50%)' }),
        animate(
          '150ms ease-in-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateX(0)' }),
        animate(
          '150ms ease-in-out',
          style({ opacity: 0, transform: 'translateX(-50%)' })
        ),
      ]),
    ]),
  ],
})
export class DirectThreadComponent implements OnInit {
  @Output() closeDirectThread = new EventEmitter<void>();
  @Input() selectedUser: any;
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
  isEmojiPickerTwoVisible = false;
  isEmojiPickerEditVisible = false;
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
  showReactionPopUpSenderAtCu: { [key: string]: boolean } = {};
  showReactionPopUpRecipientAtCu: { [key: string]: boolean } = {};
  showReactionPopUpSenderAtSu: { [key: string]: boolean } = {};
  showReactionPopUpRecipientAtSu: { [key: string]: boolean } = {};
  showReactionPopUpBoth: { [key: string]: boolean } = {};
  firstThreadValue: string | null = null;
  currentUserId: string | null = null;
  /*   lastMessageId: string | null = '0'; */
  editMessageId: string | null = null;
  editableTextarea!: ElementRef<HTMLTextAreaElement>;
  isFirstClick: boolean = true;
  editableMessageText: string = '';
  scrollHeightInput: any;
  editWasClicked = false;
  showEditOption: { [messageId: string]: boolean } = {};
  hoveredReactionIcon: boolean = false;
  wasClickedInDirectThread = false;
  getAllUsersName: any[] = [];
  @Output() userSelectedFromDirectThread = new EventEmitter<any>();
  selectedThreadId: string | null = null;
  isSelfThread = false;
  showOneDisplay = false;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}
  async ngOnInit(): Promise<void> {
    this.shouldScrollToBottom = true;
    await this.initializeUser();
    const firstInitialisedThreadMsg = this.threadControlService.getFirstThreadMessageId();
    if (firstInitialisedThreadMsg) {
      await this.processThreadMessages(firstInitialisedThreadMsg);
    }
    await this.getAllUsersname();
    this.currentUserId = this.route.snapshot.paramMap.get('id');
    this.checkIfSelfThread();
  }

  isFirstDayInfoVisible(i: number): boolean {
    return i === 0;
  }

  isFirstMessage(i: number): boolean {
    return i === 0;
  }

  checkIfSelfThread() {
    if (this.global.currentUserData.id === this.selectedUser.id) {
      this.isSelfThread = true;
      this.showOneDisplay = true;
    } else if (this.global.currentUserData.id !== this.selectedUser.id) {
      this.isSelfThread = false;
    }
  }

  letPickerVisible(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerVisible = true;
  }

  letPickerTwoVisible(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerTwoVisible = true;
  }


  letPickerEditVisible(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerEditVisible = true;
  }

  toggleEditOption(messageId: string, show: boolean) {
    this.showEditOption[messageId] = show;
  }

  displayDayInfo(index: number): boolean {
    if (index === 0) return true;
    const currentMessage = this.messagesData[index];
    const previousMessage = this.messagesData[index - 1];
    return !this.isSameDay(
      new Date(currentMessage.timestamp),
      new Date(previousMessage.timestamp)
    );
  }

  editMessages(message: any) {
    this.editWasClicked = true;
    this.editMessageId = message.id;
    this.editableMessageText = message.text;
    /*     if (this.isFirstClick) {
      setTimeout(() => {
        if (this.editableTextarea) {
          const textarea = this.editableTextarea.nativeElement;
          textarea.scrollTop = textarea.scrollHeight;
          textarea.focus();
        }
      }, 20);
      this.isFirstClick = false;
    } */
  }

  selectUserForChat(user: any) {
    this.userSelectedFromDirectThread.emit(user);
  }

  async handleMentionClick(mention: string) {
    this.wasClickedInDirectThread = true;
    const cleanName = mention.substring(1);
    const userRef = collection(this.firestore, 'users');
    onSnapshot(userRef, (querySnapshot) => {
      this.global.getUserByName = {};
      querySnapshot.forEach((doc) => {
        const dataUser = doc.data();
        const dataUserName = dataUser['name'];
        if (dataUserName === cleanName) {
          this.global.getUserByName = { id: doc.id, ...dataUser };
        }
        this.global.openMentionMessageBox = true;
      });
    });
  }

  closeMentionBoxHandler() {
    this.wasClickedInDirectThread = false;
  }

  splitMessage(text: string) {
    const regex = /(@[\w\-_!$*]+(?:\s[\w\-_!$*]+)?)/g;
    return text.split(regex);
  }

  isMention(part: string): boolean {
    if (!part.startsWith('@')) {
      return false;
    }
    const mentionName = part.substring(1);
    return this.getAllUsersName.some((user) => user.userName === mentionName);
  }

  async getAllUsersname() {
    const userRef = collection(this.firestore, 'users');
    onSnapshot(userRef, (querySnapshot) => {
      this.getAllUsersName = [];
      querySnapshot.forEach((doc) => {
        const dataUser = doc.data();
        const userName = dataUser['name'];
        this.getAllUsersName.push({ userName });
      });
    });
  }

  cancelEdit() {
    this.editMessageId = null;
    this.editableMessageText = '';
    this.editWasClicked = false;
    this.isFirstClick = true;
  }

  onCancelMessageBox(): void {
    this.wasClickedInDirectThread = false;
  }

  async saveOrDeleteMessage(message: any) {
    try {
      if (!message || !message.id) {
        console.error('Invalid message object passed to saveOrDeleteMessage');
        return;
      }
      const messageRef = doc(
        this.firestore,
        `messages/${this.firstInitialisedThreadMsg}/threadMessages/${message.id}`
      );
      if (!this.editableMessageText || this.editableMessageText.trim() === '') {
        await deleteDoc(messageRef);
      } else {
        const editMessage = {
          text: this.editableMessageText,
          editedTextShow: true,
          editedAt: new Date().toISOString(),
        };
        await updateDoc(messageRef, editMessage);
      }
      this.resetEditMode();
    } catch (error) {
      console.error('Error in saveOrDeleteMessage:', error);
    }
  }

  resetEditMode() {
    this.editMessageId = null;
    this.editableMessageText = '';
    this.isFirstClick = true;
    this.editWasClicked = false;
    this.showOptionBar = {};
  }

  /*   onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const height = (textarea.scrollTop = textarea.scrollHeight);
    this.scrollHeightInput = height;
  } */

  getDayInfoForMessage(index: number): string {
    const messageDate = new Date(this.messagesData[index].timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(messageDate, today)) {
      return 'Heute';
    } else if (this.isSameDay(messageDate, yesterday)) {
      return 'Gestern';
    } else {
      return this.formatDate(messageDate);
    }
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  scrollToBottom(): void {
    if (this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    } else {
      console.log('scrollToBottom - No scroll container found');
    }
  }

  toggleOptionBar(messageId: string, show: boolean): void {
    if (this.editWasClicked && this.editMessageId !== messageId) {
      return;
    }
    this.showOptionBar[messageId] = show;
  }

  toggleReactionInfoSenderAtCurrentUser(
    messageId: string,
    status: boolean
  ): void {
    this.showReactionPopUpSenderAtCu[messageId] = status;
  }
  toggleReactionInfoRecipientAtCurrentUser(
    messageId: string,
    status: boolean
  ): void {
    this.showReactionPopUpRecipientAtCu[messageId] = status;
  }

  toggleReactionInfoSenderAtSelectedUser(
    messageId: string,
    status: boolean
  ): void {
    this.showReactionPopUpSenderAtSu[messageId] = status;
  }
  toggleReactionInfoRecipientAtSelectedUser(
    messageId: string,
    status: boolean
  ): void {
    this.showReactionPopUpRecipientAtSu[messageId] = status;
  }

  toggleBothReactionInfo(messageId: string, show: boolean): void {
    this.showReactionPopUpBoth[messageId] = show;
  }

/*   async subscribeToThreadMessages() {
    this.threadControlService.firstThreadMessageId$.subscribe(
      async (firstInitialisedThreadMsg) => {
        if (firstInitialisedThreadMsg) {
          await this.processThreadMessages(firstInitialisedThreadMsg);
        }
      }
    );
  } */

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

  async initializeUser() {
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

  async processThreadMessages(firstInitialisedThreadMsg: string) {
    this.firstInitialisedThreadMsg = firstInitialisedThreadMsg;
    if (this.firstInitialisedThreadMsg) {
      await this.handleFirstThreadMessageAndPush(
        this.firstInitialisedThreadMsg
      );
      await this.getThreadMessages(this.firstInitialisedThreadMsg);
    }
  }

  toggleThreadStatus(status: boolean) {
    this.isDirectThreadOpen = status;
  }

  parentMessageId: any;
  async handleFirstThreadMessageAndPush(firstInitialisedThreadMsg: any) {
    this.parentMessageId = firstInitialisedThreadMsg;
    try {
      const docRef = doc(this.firestore, 'messages', firstInitialisedThreadMsg);
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        const docData = docSnapshot.data();
        if (docData?.['firstMessageCreated']) {
          this.currentThreadMessage = {
            id: docSnapshot.id,
            ...docData,
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
      await this.settingDataforFireBase(
        threadMessagesRef,
        this.currentThreadMessage
      );
    } catch (error) {
      console.error('Fehler der Thread-Nachricht:', error);
    }
  }

  async settingDataforFireBase(threadMessagesRef: any, threadMessageData: any) {
    try {
      /*       if (
        !this.selectedUser ||
        !this.selectedUser.uid ||
        !this.global.currentUserData
      ) {
        throw new Error(
          `Ungültige Daten: selectedUser = ${JSON.stringify(
            this.selectedUser
          )}, currentUserData = ${JSON.stringify(this.global.currentUserData)}`
        );
      } */
      const messageData = {
        senderId: threadMessageData.senderId,
        senderName: threadMessageData.senderName,
        senderPicture: threadMessageData.senderPicture || '',
        timestamp: new Date(),
        selectedFiles: this.selectFiles || [],
        editedTextShow: false,
        recipientId: threadMessageData.recipientId,
        recipientName: threadMessageData.recipientName,
        recipientStickerCount: 0,
        recipientSticker: '',
        text: this.currentThreadMessage?.text || '',
        firstMessageCreated: true,
        reactions: '',
      };

      const docRef = await addDoc(threadMessagesRef, messageData);
      console.log('Erstellte Nachricht-ID:', docRef.id);
/*       this.threadControlService.setLastMessageId(docRef.id); */
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Nachricht:', error);
    }
  }

  async getThreadMessages(messageId: any) {
    try {
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${messageId}/threadMessages`
      );
      const q = query(threadMessagesRef, orderBy('timestamp', 'asc'));
      onSnapshot(q, (querySnapshot) => {
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

        this.scrollAutoDown();
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('fehler getMessagws', error);
    }
  }

  scrollAutoDown() {
    if (this.shouldScrollToBottom) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 250);
    }
  }

  async updateMessagesWithNewPhoto(messageId: string) {
    try {
      const newPhotoUrl = this.global.currentUserData?.picture;
      if (!newPhotoUrl) {
        console.warn('Keine neue Foto-URL verfügbar');
        return;
      }
      const messagesToUpdate = this.messagesData.filter(
        (message) =>
          message.senderId === this.global.currentUserData.id &&
          message.senderPicture !== newPhotoUrl
      );
      if (messagesToUpdate.length === 0) {
        console.log('Keine Änderungen an senderPicture erkannt');
        return;
      }
      messagesToUpdate.forEach((message) => {
        message.senderPicture = newPhotoUrl;
      });
      this.messagesData = [...this.messagesData];
      this.cdr.detectChanges();
      const updatePromises = messagesToUpdate.map((message) => {
        const messageRef = doc(
          this.firestore,
          'messages',
          messageId,
          'threadMessages',
          message.id
        );
        return updateDoc(messageRef, { senderPicture: newPhotoUrl });
      });

      await Promise.all(updatePromises);
      console.log('Firestore-Updates für Thread-Nachrichten abgeschlossen');
    } catch (error) {
      console.error(
        'Fehler beim Aktualisieren der Nachrichten mit neuem Foto:',
        error
      );
    }
  }

  openEmojiPicker() {
console.log('One');
    this.isEmojiPickerVisible = true;
  /*   this.overlayStatusService.setOverlayStatus(true); */
  }

  openEmojiPickerTwo() {
    console.log('Two');
    this.isEmojiPickerTwoVisible = true;
    this.overlayStatusService.setOverlayStatus(true);
  }

  closePicker() {
    this.overlayStatusService.setOverlayStatus(false);
    this.isEmojiPickerVisible = false;
  }

  closePickerTwo() {
    this.overlayStatusService.setOverlayStatus(false);
    this.isEmojiPickerTwoVisible = false;
  }

  closePickerEdit() {
    this.overlayStatusService.setOverlayStatus(false);
    this.isEmojiPickerEditVisible = false;
  }

  openEmojiPickerEditMode() {
    this.isEmojiPickerEditVisible = true;
    this.overlayStatusService.setOverlayStatus(true);
  }

  addEmojiToEdit(event: any) {
    this.shouldScrollToBottom = false;
    if (event && event.emoji && event.emoji.native) {
      const emoji = event.emoji.native;
      this.editableMessageText = (this.editableMessageText || '') + emoji;
      this.closePickerEdit();
    } else {
      console.error('kein Emoji ausgewählt');
    }
  }

  async getThreadMessageRef(currentMessageId: string): Promise<any> {
    let threadMessageRef = doc(
      this.firestore,
      `messages/${currentMessageId}/threadMessages/${currentMessageId}`
    );
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
    return threadMessageRef;
  }

  async getThreadMessageDoc(threadMessageRef: any): Promise<any> {
    const docSnap = await getDoc(threadMessageRef);
    if (!docSnap.exists()) {
      console.error('thread message nicht gefunden.');
      return null;
    }
    
    const data = docSnap.data() as Record<string, any>;
    const id = docSnap.id;
    
    return { id, ...data };
  }

  async addEmoji(event: any, currentMessageId: string, userId: string) {
    try {
      const emoji = event?.emoji?.native;
      if (!emoji) {
        console.error('Kein gültiges Emoji gefunden.');
        return;
      }
      const threadMessageRef = await this.getThreadMessageRef(currentMessageId);
      const threadMessageDoc = await this.getThreadMessageDoc(threadMessageRef); 
      if (!threadMessageDoc) {
        console.error('Keine Daten für die Nachricht gefunden.');
        return;
      }
      const updatedReactions = this.updateReactions(threadMessageDoc, emoji, userId);
      if (currentMessageId === this.parentMessageId) {
        // === PARENT-NACHRICHT ===
        console.log('Parent Nachricht Emoji wird aktualisiert:', currentMessageId);
  
        const updatedParentMessage = {
          ...threadMessageDoc,
          parentThreadId: currentMessageId, 
          reactions: updatedReactions
        };
  
        await this.updateParentMessage(updatedParentMessage); 
        
      } else {
        console.log('Child-Nachricht Emoji wird aktualisiert:', currentMessageId);
        const updatedChildMessage = {
          ...threadMessageDoc,
          parentThreadId: threadMessageDoc.parentThreadId || this.parentMessageId,
  
          reactions: updatedReactions,
          editedAt: new Date().toISOString()
        };
        await updateDoc(threadMessageRef, { reactions: updatedReactions });
        this.threadControlService.updateThreadMessage(updatedChildMessage);
      }

      this.closePicker();
      this.shouldScrollToBottom = false;
  
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Emojis:', error);
    }
  }

  updateReactions(threadMessageDoc: any, emoji: string, userId: string) {
    const reactions = threadMessageDoc.reactions || {};
    const userReaction = reactions[userId];
    if (userReaction && userReaction.emoji === emoji) {
      delete reactions[userId];
    } else {
      reactions[userId] = { emoji, counter: 1 };
    }
  
    return reactions;
  }
  
  async removeStickerOrUpdateReactions(threadMessageRef: DocumentReference, threadMessageDoc: any, userId: string, emoji: string) {
    const reactions = threadMessageDoc.reactions || {};
    if (reactions[userId] && reactions[userId].emoji === emoji) {

      delete reactions[userId];
    } else {
      reactions[userId] = { emoji, counter: 1 };
    }
    const updatedChildMessage = {
      ...threadMessageDoc,
      reactions,
      editedAt: new Date().toISOString(),
    };
    await updateDoc(threadMessageRef, { reactions });
    this.threadControlService.updateThreadMessage(updatedChildMessage);
  }
  
  
  async updateParentMessage(parentMsg: any) {
    const docRef = doc(this.firestore, 'messages', parentMsg.id);
    await updateDoc(docRef, { reactions: parentMsg.reactions });
    this.threadControlService.updateThreadMessage(parentMsg);
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
    const reactionsArray = Array.isArray(reactions)
      ? reactions
      : Object.values(reactions || {});
    return (
      reactionsArray.find(
        (reaction) => reaction.senderId === this.currentUser.uid
      ) || null
    );
  }

  getRecipientReaction(reactions: any): any | null {
    const reactionsArray = Array.isArray(reactions)
      ? reactions
      : Object.values(reactions || {});
    return (
      reactionsArray.find(
        (reaction) => reaction.recipientId === this.currentUser.uid
      ) || null
    );
  }

  areEmojisSame(reactions: any): boolean {
    const userIds = this.getUserIds(reactions);
    if (userIds.length < 2) return false;
    const firstEmoji = reactions[userIds[0]]?.emoji;
    const secondEmoji = reactions[userIds[1]]?.emoji;
    return firstEmoji === secondEmoji;
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

  async handlingExistingUserReaction(
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
      console.error('fehler beim Aktualisieren der Reaktionen:', error);
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

  onMessageSent(): void {
    this.shouldScrollToBottom = true;
    this.scrollAutoDown();
  }
}
