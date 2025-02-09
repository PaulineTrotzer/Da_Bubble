import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Input,
  SimpleChanges,
  OnChanges,
  OnInit,
  ViewChild,
  Output,
  EventEmitter,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { GlobalVariableService } from '../services/global-variable.service';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  doc,
  collection,
  updateDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  getDoc,
  setDoc,
  getDocs,
} from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { InputFieldComponent } from '../input-field/input-field.component';
import { Subscription, filter } from 'rxjs';
import { ChannelChatComponent } from '../channel-chat/channel-chat.component';
import { MentionMessageBoxComponent } from '../mention-message-box/mention-message-box.component';
import { ThreadControlService } from '../services/thread-control.service';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { WorkspaceService } from '../services/workspace.service';
import { UserChannelSelectService } from '../services/user-channel-select.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InputfieldService } from '../services/inputfield.service';

@Component({
  selector: 'app-chat-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    InputFieldComponent,
    ChannelChatComponent,
    MentionMessageBoxComponent,
    PickerComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '300ms ease',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease',
          style({ opacity: 0, transform: 'translateY(-10px)' })
        ),
      ]),
    ]),
  ],
})
export class ChatComponent implements OnInit, OnChanges {
  threadControlService = inject(ThreadControlService);
  afterLoginSheet = false;
  welcomeChannelSubscription: Subscription | undefined;
  shouldScroll = true;
  global = inject(GlobalVariableService);
  chatMessage: string = '';
  selectFiles: any[] = [];
  @Input() selectedUser: any;
  @Input() selectedChannel: any;
  @Input() onHeaderUser: any;
  @Input() onHeaderChannel: any;
  messagesData: any[] = [];
  elementRef = inject(ElementRef);
  firestore = inject(Firestore);
  userservice = inject(UserService);
  userId: any | null = null;
  route = inject(ActivatedRoute);
  isiconShow: any;
  messageIdHovered: any;
  hoveredName: any;
  hoveredSenderName: any;
  wasRemoved = false;
  hoveredCurrentUser: any;
  hoveredRecipienUser: any;
  editMessageId: string | null = null;
  checkUpdateBackcolor: any;
  editableMessageText: string = '';
  showWelcomeChatText = false;
  showTwoPersonConversationTxt = false;
  @ViewChild('scrollContainer') private scrollContainer: any = ElementRef;
  @Output() threadOpened = new EventEmitter<void>();
  chosenThreadMessage: any;
  currentThreadMessageId: string | null = null;
  checkEditbox: boolean = false;
  @ViewChild('editableTextarea')
  editableTextarea!: ElementRef<HTMLTextAreaElement>;
  isFirstClick: boolean = true;
  replyCounts: Map<string, number> = new Map();
  replyCountValue: number = 0;
  checkEmojiId: any;
  isEmojiPickerVisible: boolean = false;
  isEmojiPickerVisibleEdit: boolean = false;
  @Output() userMention = new EventEmitter<any>();
  getAllUsersName: any[] = [];
  isMentionCardOpenInChat: boolean = false;
  isMentionCardOpen: boolean = false;
  wasClickedChatInput = false;
  workspaceService = inject(WorkspaceService);
  workspaceSubscription: Subscription | undefined;
  dataLoaded: boolean = false;
  cdr = inject(ChangeDetectorRef);
  userChannelService = inject(UserChannelSelectService);
  isStickerVisible = false;
  stickerHoverStates: { [messageId: string]: boolean } = {};
  sanitizer = inject(DomSanitizer);
  inputFieldService = inject(InputfieldService);
  isSelfChat?: boolean;
  hasNoMessages?: boolean;
  isOverlayOpen = false;

  constructor() {}

  onHoverSticker(message: any): void {
    setTimeout(() => {
      this.stickerHoverStates[message.id] = true;
    }, 10);
  }

  onLeaveSticker(message: any): void {
    setTimeout(() => {
      this.stickerHoverStates[message.id] = false;
    }, 10);
  }

  currentThreadMessage: any;
  currentComponentId = 'chat';

  async ngOnInit(): Promise<void> {
    this.inputFieldService.files$.subscribe((filesByComponent) => {
      this.selectFiles = filesByComponent[this.currentComponentId] || [];
    });
    this.updateSubscriptionText();
    await this.getAllUsersname();
  }

  isFirstDayInfoVisible(i: number): boolean {
    return i === 0;
  }

  async updateMessage(updatedMessage: any): Promise<void> {
    await this.ensureMessagesLoaded();
    this.shouldScroll = false;
    if (updatedMessage.deleted) {
      await this.handleDeletedMessage(updatedMessage);
      this.updateSubscriptionText();
      return;
    }

    const index = this.messagesData.findIndex(
      (msg: any) => msg.id === updatedMessage.id
    );

    if (index !== -1) {
      await this.updateExistingMessage(index, updatedMessage);
    } else {
      await this.addNewMessage(updatedMessage);
    }
    this.updateSubscriptionText();
    this.messagesData = [...this.messagesData];
  }

  isCurrentUserSender(message: any): boolean {
    // Falls du IDs verwendest:
    return message.senderId === this.global.currentUserData.uid;
    // Oder bei Namensvergleich:
    // return message.senderName === this.global.currentUserData.name;
  }

  isCurrentUserRecipient(message: any): boolean {
    // Falls du IDs verwendest:
    return message.recipientId === this.global.currentUserData.uid;
    // Oder bei Namensvergleich:
    // return message.recipientName === this.global.currentUserData.name;
  }

  async updateExistingMessage(
    index: number,
    updatedMessage: any
  ): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', updatedMessage.id);

    this.messagesData[index] = {
      ...this.messagesData[index],
      ...updatedMessage,
    };
    console.log('Nachricht lokal aktualisiert:', this.messagesData[index]);

    try {
      await updateDoc(messageRef, updatedMessage);
      console.log('Nachricht in Firebase aktualisiert:', updatedMessage.id);
    } catch (error) {
      console.error(
        'Fehler beim Aktualisieren der Nachricht in Firebase:',
        error
      );
    }

    return;
  }

  async addNewMessage(updatedMessage: any): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', updatedMessage.id);

    console.warn('Nachricht nicht gefunden, füge hinzu:', updatedMessage.id);
    this.messagesData.push(updatedMessage);

    try {
      await setDoc(messageRef, updatedMessage);
      console.log('Neue Nachricht in Firebase hinzugefügt:', updatedMessage.id);
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Nachricht in Firebase:', error);
    }
  }

  async handleDeletedMessage(updatedMessage: any): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', updatedMessage.id);
    console.log('Gelöschte Nachricht ignoriert:', updatedMessage.id);

    try {
      await deleteDoc(messageRef);
      console.log('Nachricht aus Firebase gelöscht:', updatedMessage.id);
    } catch (error) {
      console.error('Fehler beim Löschen der Nachricht in Firebase:', error);
    }

    this.messagesData = this.messagesData.filter(
      (msg: any) => msg.id !== updatedMessage.id
    );
  }

  async ensureMessagesLoaded(): Promise<void> {
    if (!this.messagesData || this.messagesData.length === 0) {
      console.log('Lade Nachrichten...');
      const snapshot = await getDocs(collection(this.firestore, 'messages'));
      const loadedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      this.messagesData = loadedMessages.map((loadedMessage) => {
        const localMessage = this.messagesData.find(
          (msg) => msg.id === loadedMessage.id
        );
        return localMessage
          ? { ...loadedMessage, ...localMessage }
          : loadedMessage;
      });

      console.log('Nachrichten geladen:', this.messagesData);
    }
  }

  ngOnDestroy() {
    this.workspaceSubscription?.unsubscribe();
  }

  onCancelMentionBox() {
    this.wasClickedChatInput = false;
  }

  async subscribeToThreadAnswers() {
    this.messagesData.forEach((message) => {
      this.threadControlService.getReplyCount(message.id).subscribe((count) => {
        this.replyCounts.set(message.id, count);
        if (this.currentThreadMessageId === message.id) {
          this.replyCountValue = count;
        }
      });
    });
  }

  closePicker() {
    this.isOverlayOpen = false;
    this.isEmojiPickerVisible = false;
  }

  openEmojiPicker() {
    this.isEmojiPickerVisible = true;
    this.isOverlayOpen = true;
  }

  openEmojiPickerEdit() {
    this.isEmojiPickerVisible = false;
    this.isEmojiPickerVisibleEdit = true;
    this.isOverlayOpen = true;
  }

  closePickerEdit() {
    this.isOverlayOpen = false;
    this.isEmojiPickerVisibleEdit = false;
  }

  getReplyCountValue(messageId: string): number {
    return this.replyCounts.get(messageId) ?? 0;
  }

  handleMentionCardOpened(isOpen: boolean) {
    this.isMentionCardOpenInChat = isOpen;
  }

  onUserNameClick() {
    const profileType =
      this.selectedUser.uid === this.userservice.getCurrentUser()
        ? 'currentUser'
        : 'contact';
    this.userservice.selectProfile(profileType);
  }

  onMessageSent(): void {
    this.scrollAutoDown();
  }

  editMessages(message: any) {
    this.editMessageId = message.id;
    this.editableMessageText = message.text;
    this.shouldScroll = false;
    if (this.isFirstClick) {
      this.isFirstClick = false;
    }
  }

  displayDayInfo(index: number): boolean {
    if (index === 0) {
      const firstMessage = this.messagesData[index];
      if (firstMessage.deleted) {
        return false;
      }
      return true;
    }
    const currentMessage = this.messagesData[index];
    const previousMessage = this.messagesData[index - 1];
    if (currentMessage.deleted || previousMessage.deleted) {
      return false;
    }
    return !this.isSameDay(
      new Date(currentMessage.timestamp),
      new Date(previousMessage.timestamp)
    );
  }

  cancelEdit() {
    this.editMessageId = null;
    this.editableMessageText = '';
    this.checkEditbox = false;
    this.isFirstClick = true;
  }

  onCancelMessageBox(): void {
    this.wasClickedChatInput = false;
  }

  resetIcon(message: any) {
    this.isiconShow = null;
    const strickerRef = doc(this.firestore, 'messages', message.id);
    updateDoc(strickerRef, { stickerBoxCurrentStyle: null });
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

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedUser'] && this.selectedUser) {
      console.log('this Suser from onChanges', this.selectedUser);
      await this.getMessages();
      console.log('Selected Files:', this.selectFiles);
      this.chatMessage = '';
      this.global.clearCurrentChannel();
    }
    if (changes['selectedChannel'] && this.selectedChannel) {
      this.clearInput();
      console.log('selectedChannel changes');
    }
    if (changes['onHeaderChannel'] && this.onHeaderChannel) {
      this.clearInput();
    }
    if (changes['onHeaderUser'] && this.onHeaderUser) {
      this.global.clearCurrentChannel();
      await this.getMessages();
      this.chatMessage = '';
    }
  }

  formatMentions(text: string): SafeHtml {
    const regex = /@([\w\-\*_!$]+(?:\s[\w\-\*_!$]+)?)/g;
    const normalizedUserNames = this.getAllUsersName.map((user: any) =>
      user.name ? user.name.trim().toLowerCase() : ''
    );

    const formattedText = text.replace(regex, (match) => {
      const mentionName = match.substring(1).trim().toLowerCase();
      if (normalizedUserNames.includes(mentionName)) {
        return `&nbsp;<span class="mention-message">${match}</span>&nbsp;`;
      }
      return match;
    });
    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }

  clearInput() {
    this.messagesData = [];
  }

  async saveOrDeleteMessage(message: any) {
    this.shouldScroll = false;
    if (!message.id) {
      console.error('Ungültige Nachricht-ID:', message);
      return;
    }
    const messageRef = doc(this.firestore, 'messages', message.id);
    if (this.editableMessageText.trim() === '') {
      try {
        const docSnapshot = await getDoc(messageRef);
        if (!docSnapshot.exists()) {
          console.warn(`Nachricht existiert nicht (ID: ${message.id}).`);
          return;
        }
        await deleteDoc(messageRef);
        this.messagesData = this.messagesData.filter(
          (msg: any) => msg.id !== message.id
        );
        const deletedMessage = { id: message.id, deleted: true };
        this.messagesData.push(deletedMessage);
        this.threadControlService.setEditedMessage(deletedMessage);
        this.editMessageId = null;
        this.isFirstClick = true;
        this.checkEditbox = false;
      } catch (error) {
        console.error(
          `Fehler beim Löschen der Nachricht (ID: ${message.id}):`,
          error
        );
      }
    } else {
      try {
        const docSnapshot = await getDoc(messageRef);
        if (!docSnapshot.exists()) {
          console.warn(
            `Nachricht kann nicht bearbeitet werden, da sie nicht existiert: ${message.id}`
          );
          return;
        }
        const editMessage = {
          text: this.editableMessageText,
          editedTextShow: true,
          editedAt: new Date().toISOString(),
        };
        await updateDoc(messageRef, editMessage);
        const index = this.messagesData.findIndex(
          (msg: any) => msg.id === message.id
        );
        if (index !== -1) {
          this.messagesData[index] = {
            ...this.messagesData[index],
            ...editMessage,
          };
        } else {
          console.warn('Nachricht nicht gefunden, füge sie hinzu:', message.id);
          this.messagesData.push({ id: message.id, ...editMessage });
        }
        this.threadControlService.setEditedMessage({
          id: message.id,
          ...editMessage,
        });
        this.editMessageId = null;
        this.checkEditbox = false;
        this.isFirstClick = true;
        setTimeout(() => {
          this.shouldScroll = true;
        }, 1000);
      } catch (error) {
        console.error(
          `Fehler beim Bearbeiten der Nachricht (ID: ${message.id}):`,
          error
        );
      }
    }
  }

  displayHiddenIcon(message: any) {
    this.isiconShow = message.id;
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
        this.userservice.observingUserChanges(userId, (updatedUser: User) => {
          this.selectedUser = updatedUser;
        });
      }
    } catch (error) {
      console.error('Fehler beim Abruf s Benutzers:', error);
    }
  }

  scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  scrollAutoDown(): void {
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  messageData(
    chatMessage: string,
    senderStickerCount: number = 0,
    recipientStickerCount: number = 0
  ): SendMessageInfo {
    const recipientId = this.selectedUser?.id;
    const recipientName = this.selectedUser?.name;
    const formattedText = chatMessage.replace(/@([\w\-_!$*]+)/g, (match) => {
      const mentionName = match.substring(1).trim().toLowerCase();
      const normalizedUserNames = this.getAllUsersName.map((name) =>
        name.trim().toLowerCase()
      );

      if (normalizedUserNames.includes(mentionName)) {
        return `<span class="mention-message">${match}</span>`;
      }
      return match;
    });

    return {
      text: chatMessage,
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      recipientId: recipientId,
      recipientName: recipientName,
      timestamp: new Date(),
      senderSticker: '',
      senderStickerCount,
      recipientSticker: '',
      recipientStickerCount,
      senderchoosedStickereBackColor: '',
      recipientChoosedStickerBackColor: '',
      stickerBoxCurrentStyle: null,
      stickerBoxOpacity: null,
      selectedFiles: this.selectFiles,
      editedTextShow: false,
      formattedText: formattedText,
    };
  }

  getConversationId(): string {
    const ids = [this.global.currentUserData?.id, this.selectedUser?.id];
    ids.sort();
    return ids.join('_');
  }

  onMessageCreated(newLocalMsg: any) {
    this.messagesData.push(newLocalMsg);
    this.scrollAutoDown();
  }

  async getMessages() {
    try {
      if (!this.selectedUser?.id || !this.global.currentUserData?.id) {
        return;
      }
      const docRef = collection(this.firestore, 'messages');
      const q = query(
        docRef,
        where('recipientId', 'in', [
          this.selectedUser.id,
          this.global.currentUserData.id,
        ]),
        where('senderId', 'in', [
          this.selectedUser.id,
          this.global.currentUserData.id,
        ])
      );
      onSnapshot(
        q,
        async (querySnapshot) => {
          try {
            this.messagesData = [];
            querySnapshot.forEach((doc) => {
              const messageData = doc.data();
              if (!this.selectedUser?.id || !this.global.currentUserData?.id) {
                console.warn(
                  'Selected user or current user data is not available.'
                );
                return;
              }
              if (messageData['timestamp'] && messageData['timestamp'].toDate) {
                messageData['timestamp'] = messageData['timestamp'].toDate();
              }
              messageData['formattedText'] = this.formatMentions(
                messageData['text']
              );
              if (
                (messageData['senderId'] === this.global.currentUserData.id &&
                  messageData['recipientId'] === this.selectedUser.id) ||
                (messageData['senderId'] === this.selectedUser.id &&
                  messageData['recipientId'] === this.global.currentUserData.id)
              ) {
                this.messagesData.push({ id: doc.id, ...messageData });
              }
            });
            await this.updateMessagesWithNewPhoto();
            this.messagesData.sort(
              (a: any, b: any) => a.timestamp - b.timestamp
            );
            this.updateSubscriptionText();
            if (this.shouldScroll) {
              this.scrollAutoDown();
            }
            this.dataLoaded = true;
            await this.subscribeToThreadAnswers();
          } catch (innerError) {
            console.error('Error while querySnapshot:', innerError);
          }
        },
        (error) => {
          console.error('Error in onSnapshot:', error);
        }
      );
    } catch (error) {
      console.error('Error initializing messages query:', error);
    }
  }

  updateSubscriptionText() {
    this.isSelfChat = this.selectedUser?.id === this.global.currentUserData?.id;
    this.hasNoMessages = this.messagesData.length === 0;
    this.showWelcomeChatText = false;
    this.showTwoPersonConversationTxt = false;
    if (this.isSelfChat && this.hasNoMessages) {
      this.showWelcomeChatText = true;
    } else if (!this.isSelfChat && this.hasNoMessages) {
      this.showTwoPersonConversationTxt = true;
    }
  }

  async updateMessagesWithNewPhoto() {
    try {
      const newPhotoUrl = this.global.currentUserData?.picture;
      if (newPhotoUrl) {
        for (let message of this.messagesData) {
          if (message.senderId === this.global.currentUserData.id) {
            if (message.senderPicture !== newPhotoUrl) {
              message.senderPicture = newPhotoUrl;
              this.cdr.detectChanges();
            }
          }
        }
        const updatePromises = this.messagesData
          .filter(
            (message) =>
              message.senderId === this.global.currentUserData.id &&
              message.senderPicture !== newPhotoUrl
          )
          .map(async (message) => {
            const messageRef = doc(this.firestore, 'messages', message.id);
            return updateDoc(messageRef, { photoUrl: newPhotoUrl });
          });

        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error(
        'Fehler beim Aktualisieren der Nachrichten mit neuem Foto:',
        error
      );
    }
  }

  async openThread(messageId: any) {
    this.chosenThreadMessage = null;
    try {
      this.threadOpened.emit();
      this.global.setCurrentThreadMessage(messageId);
      this.chosenThreadMessage = messageId;
      this.threadControlService.setFirstThreadMessageId(messageId);
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${messageId}/threadMessages`
      );
      const snapshot = await getDocs(threadMessagesRef);
      this.shouldScroll = false;
      if (snapshot.empty) {
        const docRef = doc(this.firestore, 'messages', messageId);
        await setDoc(docRef, { firstMessageCreated: false }, { merge: true });
      }
    } catch (error) {
      console.error('Fehler beim Öffnen des Threads:', error);
    }
    this.openvollThreadBox();
    this.hiddenFullChannelOrUserThreadBox();
    this.checkWidthSize();
    this.checkThreadOpen();
  }

  checkThreadOpen() {
    if (window.innerWidth <= 750 && this.global.openChannelorUserBox) {
      this.global.openChannelorUserBox = false;
    }
  }

  checkWidthSize() {
    if (window.innerWidth <= 750) {
      return (this.global.openChannelOrUserThread = true);
    } else {
      return (this.global.openChannelOrUserThread = false);
    }
  }

  openvollThreadBox() {
    if (window.innerWidth <= 1349 && window.innerWidth > 720) {
      return (this.global.checkWideChannelOrUserThreadBox = true);
    } else {
      return (this.global.checkWideChannelOrUserThreadBox = false);
    }
  }

  hiddenFullChannelOrUserThreadBox() {
    if (
      window.innerWidth <= 1349 &&
      window.innerWidth > 720 &&
      this.global.checkWideChannelorUserBox
    ) {
      this.global.checkWideChannelorUserBox = false;
    }
  }

  splitMessage(text: string): string[] {
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

  closeMentionBoxHandler() {
    this.wasClickedChatInput = false;
  }

  onInputClick() {
    this.wasClickedChatInput = true;
  }

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

  async handleMentionClick(mention: string) {
    this.wasClickedChatInput = true;
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

  scrollHeightInput: any;

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const height = (textarea.scrollTop = textarea.scrollHeight);
    this.scrollHeightInput = height;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const targetElement = this.elementRef.nativeElement;
    const emojiButton = targetElement.querySelector(
      '.emoji-picker-container div'
    );
    const emojiPicker = targetElement.querySelector(
      '.emoji-picker-container .emoji-picker'
    );
    const isEmojiButtonClicked =
      emojiButton && emojiButton.contains(event.target);
    const isPickerClicked = emojiPicker && emojiPicker.contains(event.target);
    if (!isEmojiButtonClicked && !isPickerClicked) {
      this.isEmojiPickerVisible = false;
    }
  }

  letPickerVisible(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerVisible = true;
  }

  letEditPickerVisible(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerVisibleEdit = true;
  }


  async addEmoji(event: any, message: any) {
    const emoji = event.emoji.native;
    this.shouldScroll = false;
    const currentUserIsSender = (this.global.currentUserData?.id === message.senderId);
    if (currentUserIsSender) {
      message.senderchoosedStickereBackColor = emoji;
      message.stickerBoxCurrentStyle = true;
      if (message.senderSticker === emoji) {
        message.senderSticker = '';
        message.senderStickerCount = 0;
      } 
      else {
        message.senderSticker = emoji;
        message.senderStickerCount = 1;
      }
    } 
    else {
      message.recipientChoosedStickerBackColor = emoji;
      message.stickerBoxCurrentStyle = true;
      if (message.recipientSticker === emoji) {
        message.recipientSticker = '';
        message.recipientStickerCount = 0;
      } 
      else {
        message.recipientSticker = emoji;
        message.recipientStickerCount = 1;
      }
    }
    this.isEmojiPickerVisible = false;
    this.messageIdHovered = null;
    const docRef = doc(this.firestore, 'messages', message.id);
    await updateDoc(docRef, {
      senderSticker: message.senderSticker,
      senderStickerCount: message.senderStickerCount,
      recipientSticker: message.recipientSticker,
      recipientStickerCount: message.recipientStickerCount,
      senderchoosedStickereBackColor: message.senderchoosedStickereBackColor,
      recipientChoosedStickerBackColor: message.recipientChoosedStickerBackColor,
      stickerBoxCurrentStyle: message.stickerBoxCurrentStyle,
      stickerBoxOpacity: message.stickerBoxOpacity
    });
  
    this.closePicker();
  }
  

  async emojiSender(message: any) {
    this.wasRemoved = false;
    if (message.senderSticker) {
      const event = { emoji: { native: message.senderSticker } };
      await this.addEmoji(event, message);
    }
    message.stickerBoxCurrentStyle = true;
  }


async emojirecipient(message: any) {
  this.wasRemoved = false;
  if (message.recipientSticker) {
    const event = { emoji: { native: message.recipientSticker } };
    await this.addEmoji(event, message);
  }
  message.stickerBoxCurrentStyle = true;
}


  editMessageAdd(event: any) {
    const emoji = event.emoji.native;
    this.editableMessageText += emoji;
    this.closePickerEdit();
  }

  @HostListener('document:click', ['$event'])
  onEMojiEditClick(event: MouseEvent) {
    const targetElement = this.elementRef.nativeElement;
    const emojiButton = targetElement.querySelector('.edit-emoji-main div');
    const emojiPicker = targetElement.querySelector(
      '.edit-emoji-main .emoji-picker-edit'
    );

    const isEmojiButtonClicked =
      emojiButton && emojiButton.contains(event.target);
    const isPickerClicked = emojiPicker && emojiPicker.contains(event.target);

    if (!isEmojiButtonClicked && !isPickerClicked) {
      this.isEmojiPickerVisibleEdit = false;
    }
  }

  chatByUserName: any;
  @Output() enterChatUser = new EventEmitter<any>();

  enterChatByUserName(user: any) {
    this.chatByUserName = user;
    this.enterChatUser.emit(this.chatByUserName);
    this.selectUser(user);
    this.wasClickedChatInput = false;
  }

  selectUser(user: any) {
    this.selectedUser = user;
  }
}
