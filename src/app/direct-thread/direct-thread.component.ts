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
  addDoc,
  orderBy,
  setDoc,
  deleteDoc,
  getDocs,
} from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { OverlayStatusService } from '../services/overlay-status.service';
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

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}
  async ngOnInit(): Promise<void> {
/*     console.log('threadOpenend');
    this.threadControlService.editedMessage$
      .pipe(filter((message) => !!message))
      .subscribe((updatedMessage) => {
        console.log(
          'Bearbeitete Nachricht erhalten im Thread:',
          updatedMessage
        );
        this.updateThreadMessage(updatedMessage);
      }); */
    this.shouldScrollToBottom = true;
    await this.initializeComponent();
    this.subscribeToThreadChanges();
    this.setCurrentUserId();
    this.checkIfSelfThread();
  }

/*   focusInputField(): void {
    if (this.inputFieldComponent) { */
/*       this.inputFieldComponent.focusInputField(); */
 /*    }
  } */

/*   activeComponentId: string = 'direct-thread';
  handleInputFieldFocused(componentId: string): void {
    console.log('InputField focused in component:', componentId);
    this.activeComponentId = componentId; // Setze die aktive Komponente
  }
 */
  handleClickOnMention(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains('mention-message')) {
      const mentionName = target.textContent?.trim();
      if (mentionName) {
        if (this.getAllUsersName.length === 0) {
          console.warn('Mentions-Daten sind noch nicht geladen.');
          return;
        }
        this.handleMentionClick(mentionName);
      }
    }
  }

  async initializeComponent(): Promise<void> {
    await this.initializeUser();
    await this.getAllUsersname();
  }

  subscribeToThreadChanges() {
    this.threadControlService.firstThreadMessageId$
    .pipe(
      filter((id: string | null): id is string => !!id)
      //                 ^^^^^^^^^^^^^^^  type guard
    )
    .subscribe((id: string) => {
      // Jetzt weiß TS, id ist ein string
      this.firstThreadMessageId = id;
      this.subscribeToParentDoc(id);
      this.subscribeToThreadReplies(id);
    });  
  }

  private subscribeToParentDoc(parentId: string) {
    const parentRef = doc(this.firestore, 'messages', parentId);
    onSnapshot(parentRef, (docSnap) => {
      if (docSnap.exists()) {
        let data = docSnap.data() as any;
  
        // Falls data.timestamp ein Firestore.Timestamp ist, wandelst du es um:
        if (data.timestamp && data.timestamp.toDate) {
          data.timestamp = data.timestamp.toDate(); // → jetzt ein JS-Date
        }
  
        this.parentMessage = { id: docSnap.id, ...data };
        console.log('Aktualisierte Parent-Nachricht:', this.parentMessage);
  
        this.scrollAutoDown();
        this.cdr.detectChanges();
      } else {
        console.warn('Parent-Dokument existiert nicht mehr:', parentId);
      }
    });
  }
  
  
  private subscribeToThreadReplies(parentId: string) {
    const repliesRef = collection(this.firestore, `messages/${parentId}/threadMessages`);
    const q = query(repliesRef, orderBy('timestamp', 'asc'));
    onSnapshot(q, (snapshot) => {
      this.messagesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        // ggf. Timestamp anpassen
        if (data['timestamp']?.toDate) {
          data['timestamp'] = data['timestamp'].toDate();
        }
        return { id: doc.id, ...data };
      });
      console.log('Aktualisierte Replies:', this.messagesData);
      this.scrollAutoDown();
      this.cdr.detectChanges();
    });
  }
  

/*   updateThreadMessage(updatedMessage: any): void {
    // Falls der "bearbeitete" Datensatz die Parent-Nachricht ist:
    if (updatedMessage.id === this.parentMessage?.id) {
      // Aktualisiere einfach die Parent-Message-Felder
      this.parentMessage.text = updatedMessage.text;
      this.parentMessage.editedTextShow = updatedMessage.editedTextShow;
      this.parentMessage.editedAt = updatedMessage.editedAt;
      console.log('Parent-Nachricht lokal aktualisiert:', this.parentMessage);
  
      // ggf. detectChanges
      this.cdr.detectChanges();
    } else {
      // Falls du hier noch Sub-Replies updaten willst (z.B. es war eine Antwort im Thread)
      // Dann müsstest du messagesData[...] anpassen.
      console.warn('Kein Update nötig, denn es ist keine Parent-Message:', updatedMessage.id);
    }
  }
   */

  async ensureMessagesLoaded(): Promise<void> {
    if (!this.messagesData || this.messagesData.length === 0) {
      console.log('Lade Nachrichten...');
      const snapshot = await getDocs(
        collection(
          this.firestore,
          `messages/${this.firstInitialisedThreadMsg}/threadMessages`
        )
      );
      this.messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('Nachrichten erfolgreich geladen:', this.messagesData);
    }
  }

  setCurrentUserId(): void {
    this.currentUserId = this.route.snapshot.paramMap.get('id');
  }

  getReplyCountText(): string {
    const replyCount = this.messagesData.length > 1 ? this.messagesData.length - 1 : 0;
    if (replyCount === 1) {
      return '1 Antwort';
    } else if (replyCount > 1) {
      return `${replyCount} Antworten`;
    } else {
      return 'Keine Antworten';
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
    const user = await this.ensureUserDataLoaded(cleanName);

    if (!user) {
      return;
    }
    this.global.getUserByName = user;
    this.global.openMentionMessageBox = true;
  }

  async ensureUserDataLoaded(name: string): Promise<any> {
    while (this.getAllUsersName.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const foundUser = this.getAllUsersName.find(
      (user) => user.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (!foundUser) {
      console.warn('Benutzer nicht gefunden:', name);
      return null;
    }
    return foundUser;
  }

  closeMentionBoxHandler() {
    this.wasClickedInDirectThread = false;
  }

  splitMessage(text: string | undefined): string[] {
    if (!text) {
      return [];
    }
    const regex = /(@[\w\-_!$*]+)/g;
    const parts = text.split(regex);
    const cleanedParts = parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    return cleanedParts;
  }

  isMention(textPart: string): boolean {
    const normalizedUserNames = this.getAllUsersName.map((user: any) =>
      user.name.trim().toLowerCase()
    );
    const mentionName = textPart.startsWith('@')
      ? textPart.substring(1).toLowerCase()
      : '';
    return normalizedUserNames.includes(mentionName);
  }

  async getAllUsersname(): Promise<void> {
    const userRef = collection(this.firestore, 'users');
    return new Promise((resolve) => {
      onSnapshot(userRef, (querySnapshot) => {
        this.getAllUsersName = [];
        querySnapshot.forEach((doc) => {
          const dataUser = doc.data();
          this.getAllUsersName.push({
            name: dataUser['name'],
            email: dataUser['email'],
            picture: dataUser['picture'] || 'assets/img/default-avatar.png',
            id: doc.id,
          });
        });
        resolve();
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

  async saveOrDeleteMessage(message: SendMessageInfo) {
    try {
      if (!message || !message.id) {
        console.error('Invalid message object passed to saveOrDeleteMessage');
        return;
      }
  
      let docPath: string;
      if (message.isParent) {
        // → Parent-Dokument
        //  In message.id steckt dann "parentId"
        docPath = `messages/${message.id}`;
      } else {
        // → Sub-Dokument (Reply)
        docPath = `messages/${this.firstInitialisedThreadMsg}/threadMessages/${message.id}`;
      }
  
      const messageRef = doc(this.firestore, docPath);
  
      // Dann wie gehabt: löschen oder bearbeiten ...
      if (!this.editableMessageText || this.editableMessageText.trim() === '') {
        await deleteDoc(messageRef);
        console.log('Nachricht gelöscht:', message.id);
      } else {
        const updatedFields = {
          text: this.editableMessageText,
          editedTextShow: true,
          editedAt: new Date().toISOString(),
        };
        await updateDoc(messageRef, updatedFields);
        console.log('Nachricht aktualisiert:', message.id);
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

  /*  async subscribeToThreadMessages() {
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
    } catch (error) {
      console.error('Fehler beim Laden des Benutzers:', error);
    }
  }

  async processThreadMessages(firstInitialisedThreadMsg: string) {
    // Nur zur Absicherung, dass parentDoc existiert => kein Duplikat in Subcollection
    const docRef = doc(this.firestore, 'messages', firstInitialisedThreadMsg);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      // Falls es das Dokument gar nicht gab, legen wir es minimal an
      await setDoc(docRef, { firstMessageCreated: true }, { merge: true });
      console.log('Erstes Parent-Dokument angelegt:', firstInitialisedThreadMsg);
    }
    // Dann brauchst du es gar nicht weiter duplizieren;
    // Dein subscribeToThreadChanges() holt sich den Parent + Replies via onSnapshot.
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
        // Parent existiert schon, nichts weiter tun
        this.currentThreadMessage = { id: docSnapshot.id, ...docData };
        return;
      }
    }
  
    // Falls wir sicherstellen wollen, dass es existiert
    await setDoc(docRef, { firstMessageCreated: true }, { merge: true });
    this.currentThreadMessage = {
      id: docSnapshot.id,
      ...docSnapshot.data(),
    };
  
    // KEIN zusätzliches addDoc(...) an threadMessagesRef mehr
    // -> So sparst du dir das Duplikat der Parent.
  }
  
  

/*   async settingDataforFireBase(threadMessagesRef: any, threadMessageData: any) {
    try { */
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
/*       const messageData = {
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
        isParent: threadMessageData.isParent ?? false,
        parentId: this.firstInitialisedThreadMsg,
      };
      const docRef = await addDoc(threadMessagesRef, messageData);
      console.log('Erstellte Nachricht-ID:', docRef.id);
      // this.threadControlService.setLastMessageId(docRef.id);
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Nachricht:', error);
    }
  } */

  async getThreadMessages(messageId: any) {
    try {
      const threadMessagesRef = collection(this.firestore, `messages/${messageId}/threadMessages`);
      const q = query(threadMessagesRef, orderBy('timestamp', 'asc'));
      onSnapshot(q, (querySnapshot) => {
        this.messagesData = querySnapshot.docs.map((doc) => {
          const messageData = doc.data();
          console.log('ThreadDoc data:', doc.id, messageData);
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
      console.error('[getThreadMessages] fehler:', error);
    }}

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
    this.isEmojiPickerVisible = true;
    this.overlayStatusService.setOverlayStatus(true);
  }

  closePicker() {
    this.overlayStatusService.setOverlayStatus(false);
    this.isEmojiPickerVisible = false;
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
    const threadMessageDoc = await getDoc(threadMessageRef);
    if (!threadMessageDoc.exists()) {
      console.error('thread message nicht gefunden.');
      return null;
    }
    return threadMessageDoc.data();
  }

  async addEmoji(event: any, currentMessageId: string, userId: string) {
    try {
      const emoji = event.emoji.native;
      const threadMessageRef = await this.getThreadMessageRef(currentMessageId);
      const threadMessageDoc = await this.getThreadMessageDoc(threadMessageRef);

      if (!threadMessageDoc) {
        console.error('Keine Daten für die Nachricht gefunden.');
        return;
      }
      const reactions = threadMessageDoc['reactions'] || {};
      const userReaction = reactions[userId];
      if (userReaction && userReaction.emoji === emoji) {
        reactions[userId].counter = userReaction.counter === 0 ? 1 : 0;
      } else {
        reactions[userId] = { emoji, counter: 1 };
      }
      this.closePicker();
      this.shouldScrollToBottom = false;
      await updateDoc(threadMessageRef, { reactions });
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Emojis:', error);
    }
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
    this.unsubscribe$.next();
    this.unsubscribe$.complete();

    this.unsubscribe$ = new Subject<void>();
  }

  onMessageSent(): void {
    this.shouldScrollToBottom = true;
    this.scrollAutoDown();
  }
}
