import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
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
  orderBy,
  setDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { filter, firstValueFrom, Subject, Subscription, takeUntil } from 'rxjs';
import { InputFieldComponent } from '../input-field/input-field.component';
import { ThreadControlService } from '../services/thread-control.service';
import { Emoji } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { currentThreadMessage } from '../models/threadMessage.class';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { MentionMessageBoxComponent } from '../mention-message-box/mention-message-box.component';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { ThreadParentMessageComponent } from '../thread-parent-message/thread-parent-message.component';
import { MentionThreadService } from '../services/mention-thread.service';

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
    ThreadParentMessageComponent,
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
export class DirectThreadComponent implements OnInit, OnDestroy {
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
  isEmojiPickerEditVisible = false;
  currentSrc?: string;
  icons: { [key: string]: string } = {
    iconMore: 'assets/img/more_vertical.svg',
    iconAddReaction: 'assets/img/comment/add_reaction.svg',
    iconThird: 'assets/img/third.svg',
  };
  isDirectThreadOpen: boolean = true;
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
  lastProcessedThreadMessageId: string | null = null;
  unsubscribe$ = new Subject<void>();
  @ViewChild(InputFieldComponent) inputFieldComponent!: InputFieldComponent;
  parentMessage: any;
  public firstThreadMessageId: string | null = null;
  isOverlayOpen = false;
  mentionService = inject(MentionThreadService);
  localUserLastEmoji: any;
  showTooltipForSenderEmoji: { [messageId: string]: boolean } = {};

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}
  async ngOnInit(): Promise<void> {
    await this.mentionService.getAllUsersname();
    this.shouldScrollToBottom = true;
    await this.initializeComponent();
    this.subscribeToThreadChanges();
    this.setCurrentUserId();
    this.checkIfSelfThread();
  }

  toggleReactionInfoForSenderEmoji(messageId: string, show: boolean) {
    this.showTooltipForSenderEmoji[messageId] = show;
  }

  onMentionClicked(mentionValue: string) {
    this.wasClickedInDirectThread = true;
  }

  handleClickOnMention(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains('mention-message')) {
      const mentionName = target.textContent?.trim();
      if (mentionName) {
        if (this.getAllUsersName.length === 0) {
          return;
        }
        this.handleMentionClick(mentionName);
      }
    }
  }

  async initializeComponent(): Promise<void> {
    await this.initializeUser();
  }

  subscribeToThreadChanges() {
    this.threadControlService.firstThreadMessageId$
      .pipe(filter((id: string | null): id is string => !!id))
      .subscribe((id: string) => {
        this.firstThreadMessageId = id;
        this.subscribeToParentDoc(id);
        this.subscribeToThreadReplies(id);
      });
  }

  private subscribeToParentDoc(parentId: string) {
    const parentRef = doc(this.firestore, 'messages', parentId);
    onSnapshot(parentRef, async (docSnap) => {
      if (!docSnap.exists()) {
        console.warn('Kein Doc mehr:', parentId);
        return;
      }
      const data = docSnap.data();
      if (data['timestamp']?.toDate) {
        data['timestamp'] = data['timestamp'].toDate();
      }
      const tempParentMsg = { id: docSnap.id, ...data };
      await this.updateSingleParentMessagePhoto(tempParentMsg);
      this.parentMessage = tempParentMsg;
    });
  }

  async updateSingleParentMessagePhoto(message: any) {
    if (!message) return;

    const newPhotoUrl = this.global.currentUserData?.picture;
    if (!newPhotoUrl) return;
    if (
      message.senderId === this.global.currentUserData.id &&
      message.senderPicture !== newPhotoUrl
    ) {
      message.senderPicture = newPhotoUrl;
      const docRef = doc(this.firestore, 'messages', message.id);
      await updateDoc(docRef, { senderPicture: newPhotoUrl });
    }
  }

  private subscribeToThreadReplies(parentId: string) {
    const repliesRef = collection(
      this.firestore,
      `messages/${parentId}/threadMessages`
    );
    const q = query(repliesRef, orderBy('timestamp', 'asc'));
    onSnapshot(q, async (snapshot) => {
      this.messagesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        if (data['timestamp']?.toDate) {
          data['timestamp'] = data['timestamp'].toDate();
        }
        return { id: doc.id, ...data };
      });
      this.scrollAutoDown();
      this.cdr.detectChanges();
      await this.updateMessagesWithNewPhoto(parentId);
    });
  }

  setCurrentUserId(): void {
    this.currentUserId = this.route.snapshot.paramMap.get('id');
    if (this.currentUserId) {
      this.subscribeToLastUsedEmoji(this.currentUserId);
    }
  }

  isFirstDayInfoVisible(i: number): boolean {
    return i === 0;
  }

  isFirstMessage(i: number): boolean {
    return i === 0;
  }

  checkIfSelfThread() {
    if (!this.global.currentUserData || !this.global.currentUserData.id) {
      console.warn(
        'currentUserData oder dessen ID ist nicht definiert:',
        this.global.currentUserData
      );
      return;
    }
    if (!this.selectedUser || !this.selectedUser.id) {
      console.warn(
        'selectedUser oder dessen ID ist nicht definiert:',
        this.selectedUser
      );
      return;
    }
    if (this.global.currentUserData.id == this.selectedUser.id) {
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

  displayDayInfoForParent(): string {
    if (!this.parentMessage?.timestamp) {
      return '';
    }
    const date = this.parentMessage.timestamp as Date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return 'Heute';
    } else if (this.isSameDay(date, yesterday)) {
      return 'Gestern';
    } else {
      return this.formatDate(date);
    }
  }

  editMessages(message: any) {
    this.editWasClicked = true;
    this.editMessageId = message.id;
    this.editableMessageText = message.text;
  }

  selectUserForChat(user: any) {
    this.userSelectedFromDirectThread.emit(user);
  }

  async handleMentionClick(mention: string) {
    this.wasClickedInDirectThread = true;
    const cleanName = mention.substring(1).trim().toLowerCase();
    const user = await this.mentionService.ensureUserDataLoaded(cleanName);
    if (!user) {
      return;
    }
    this.global.getUserByName = user;
    this.global.openMentionMessageBox = true;
  }

  closeMentionBoxHandler() {
    this.wasClickedInDirectThread = false;
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

  async saveOrDeleteMessage(message: SendMessageInfo) {
    try {
      if (!this.firstThreadMessageId) {
        console.error('Kein Parent (firstThreadMessageId) vorhanden.');
        return;
      }
      const docPath = `messages/${this.firstThreadMessageId}/threadMessages/${message.id}`;
      const messageRef = doc(this.firestore, docPath);
      if (!this.editableMessageText || this.editableMessageText.trim() === '') {
        await deleteDoc(messageRef);
      } else {
        const updatedFields = {
          text: this.editableMessageText.trim(),
          editedTextShow: true,
          editedAt: new Date().toISOString(),
        };
        await updateDoc(messageRef, updatedFields);
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

  getUserIds(reactions: {
    [key: string]: { emoji: string; counter: number };
  }): string[] {
    return Object.keys(reactions);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
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
      const userDocRef = doc(this.firestore, 'users', userID);
      onSnapshot(userDocRef, (docSnap) => {
        if (!docSnap.exists()) {
          return;
        }
        const data = docSnap.data();
        this.currentUser.lastUsedEmoji = data?.['lastUsedEmoji'] || '';
      });
    } catch (error) {
      console.error('Fehler beim Laden des Benutzers:', error);
    }
  }

  async processThreadMessages(firstInitialisedThreadMsg: string) {
    const docRef = doc(this.firestore, 'messages', firstInitialisedThreadMsg);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      await setDoc(docRef, { firstMessageCreated: true }, { merge: true });
    }
  }

  toggleThreadStatus(status: boolean) {
    this.isDirectThreadOpen = status;
  }

  async handleFirstThreadMessageAndPush(firstInitialisedThreadMsg: string) {
    const docRef = doc(this.firestore, 'messages', firstInitialisedThreadMsg);
    const docSnapshot = await getDoc(docRef);

    if (docSnapshot.exists()) {
      const docData = docSnapshot.data();
      if (docData?.['firstMessageCreated']) {
        this.currentThreadMessage = { id: docSnapshot.id, ...docData };
        return;
      }
    }
    await setDoc(docRef, { firstMessageCreated: true }, { merge: true });
    this.currentThreadMessage = {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    };
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
    } catch (error) {
      console.error(
        'Fehler beim Aktualisieren der Nachrichten mit neuem Foto:',
        error
      );
    }
  }

  openEmojiPicker() {
    this.isEmojiPickerVisible = true;
    this.isOverlayOpen = true;
  }

  closePicker() {
    this.isOverlayOpen = false;
    this.isEmojiPickerVisible = false;
  }

  closePickerEdit() {
    this.isOverlayOpen = false;
    this.isEmojiPickerEditVisible = false;
  }

  openEmojiPickerEditMode() {
    this.isEmojiPickerEditVisible = true;
    this.isOverlayOpen = true;
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
    const threadMessageDoc = await getDoc(threadMessageRef);
    if (!threadMessageDoc.exists()) {
      console.error('thread message nicht gefunden.');
      return null;
    }
    return threadMessageDoc.data();
  }

  async addEmoji(
    event: any,
    currentMessageId: string,
    userId: string,
    origin: string
  ) {
    const emoji = event?.emoji?.native;
    if (!emoji) return;

    const threadMessageRef = await this.getThreadMessageRef(currentMessageId);
    const threadMessageDoc = await this.getThreadMessageDoc(threadMessageRef);
    if (!threadMessageDoc) return;

    const reactions = threadMessageDoc['reactions'] || {};
    const userReaction = reactions[userId];
    if (userReaction && userReaction.emoji === emoji) {
      reactions[userId].counter = userReaction.counter === 0 ? 1 : 0;
    } else {
      reactions[userId] = { emoji, counter: 1 };
    }
    await this.saveLastUsedEmoji(userId, emoji);
    this.closePicker();
    this.shouldScrollToBottom = false;
    await updateDoc(threadMessageRef, { reactions });
  }

  async saveLastUsedEmoji(uid: string, emoji: string) {
    const emojiDocRef = doc(
      this.firestore,
      `users/${uid}/privateMeta`,
      'emojiMeta'
    );
    await setDoc(emojiDocRef, { lastUsedEmoji: emoji }, { merge: true });
  }

  subscribeToLastUsedEmoji(uid: string) {
    const emojiDocRef = doc(
      this.firestore,
      `users/${uid}/privateMeta`,
      'emojiMeta'
    );
    onSnapshot(emojiDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.localUserLastEmoji = data['lastUsedEmoji'] || null;
      } else {
        this.localUserLastEmoji = null;
      }
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
    this.global.openChannelorUserBox = true;
/*     this.global.currentThreadMessageSubject.next(null); */
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.unsubscribe$ = new Subject<void>();
    if(window.innerWidth < 900 ){
      this.global.openChannelorUserBox = false;
    }
  }

  onMessageSent(): void {
    this.shouldScrollToBottom = true;
    this.scrollAutoDown();
  }

  applyGlobalEmojiToThread(emoji: string, message: any) {
    const fakeEvent = { emoji: { native: emoji } };
    this.addEmoji(fakeEvent, message.id, this.currentUser.uid, 'FROM_APPLY');
  }
}
