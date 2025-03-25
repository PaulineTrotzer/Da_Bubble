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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InputfieldService } from '../services/inputfield.service';
import { formatDate, isSameDay, displayDayInfo } from '../date-utils';
import { fadeInOutAnimation } from './component.animation';
import { MentionThreadService } from '../services/mention-thread.service';

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
  animations: [fadeInOutAnimation],
})
export class ChatComponent implements OnInit, OnChanges {
  threadControlService = inject(ThreadControlService);
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
  route = inject(ActivatedRoute);
  isiconShow: any;
  messageIdHovered: any;
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
  isEmojiPickerVisible: boolean = false;
  isEmojiPickerVisibleEdit: boolean = false;
  @Output() userMention = new EventEmitter<any>();
  getAllUsersName: any[] = [];
  isMentionCardOpenInChat: boolean = false;
  wasClickedChatInput = false;
  workspaceService = inject(WorkspaceService);
  workspaceSubscription: Subscription | undefined;
  dataLoaded: boolean = false;
  cdr = inject(ChangeDetectorRef);
  stickerHoverStates: { [messageId: string]: boolean } = {};
  sanitizer = inject(DomSanitizer);
  inputFieldService = inject(InputfieldService);
  isSelfChat?: boolean;
  hasNoMessages?: boolean;
  isOverlayOpen = false;
  showReactionPopUpSenderAtCu: { [messageId: string]: boolean } = {};
  editWasClicked = false;
  chatByUserName: any;
  @Output() enterChatUser = new EventEmitter<any>();
  showReactionPopUpRecipientAtCu: { [messageId: string]: boolean } = {};
  scrollHeightInput: any;
  currentThreadMessage: any;
  currentComponentId = 'chat';
  isNarrowScreen = false;
  currentMessage: any = null;
  allUsersFromDb: any[] = [];
  mentionService = inject(MentionThreadService);

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

  async ngOnInit(): Promise<void> {
    this.inputFieldService.files$.subscribe((filesByComponent) => {
      this.selectFiles = filesByComponent[this.currentComponentId] || [];
    });
    await this.mentionService.getAllUsersname();
    this.allUsersFromDb = await this.getAllUsersFromDb();
    this.updateSubscriptionText();
    this.messagesData.forEach((msg) => {
      this.showReactionPopUpSenderAtCu[msg.id] = false;
    });
    this.ensureMessagesLoaded();
    this.checkEditScreenSize();
  }

  async getAllUsersFromDb(): Promise<any[]> {
    const userRef = collection(this.firestore, 'users');
    return new Promise((resolve) => {
      onSnapshot(userRef, (querySnapshot) => {
        const users = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data['name'] || 'Gelöschter Benutzer',
            username: data['username'] || '',
            email: data['email'] || '',
            picture: data['picture'] || 'assets/img/default-avatar.png',
          };
        });
        this.allUsersFromDb = users;
        resolve(users);
      });
    });
  }

  checkEditScreenSize() {
    this.isNarrowScreen = window.innerWidth < 600;
  }

  toggleReactionInfoSender(messageId: string, status: boolean) {
    this.showReactionPopUpSenderAtCu[messageId] = status;
  }

  toggleReactionInfoRecipient(messageId: string, status: boolean) {
    this.showReactionPopUpRecipientAtCu[messageId] = status;
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
    return message.senderId === this.global.currentUserData.uid;
  }

  isCurrentUserRecipient(message: any): boolean {
    return message.recipientId === this.global.currentUserData.uid;
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
    try {
      await updateDoc(messageRef, updatedMessage);
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
    this.messagesData.push(updatedMessage);
    try {
      await setDoc(messageRef, updatedMessage);
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Nachricht in Firebase:', error);
    }
  }

  convertToDate(timestamp: any): Date {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp?.toDate) return timestamp.toDate();
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  }
  async handleDeletedMessage(updatedMessage: any): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', updatedMessage.id);
  
    try {
      await deleteDoc(messageRef);
    } catch (error) {
      console.error('Fehler beim Löschen der Nachricht in Firebase:', error);
    }
  
    const index = this.messagesData.findIndex((msg: any) => msg.id === updatedMessage.id);
    if (index !== -1) {
      this.messagesData[index] = {
        ...this.messagesData[index],
        deleted: true
      };
    } else {
      this.messagesData.push({
        id: updatedMessage.id,
        deleted: true
      });
    }
  
    this.messagesData = [...this.messagesData]; // trigger ChangeDetection
  }
  

  async ensureMessagesLoaded(): Promise<void> {
    if (!this.messagesData || this.messagesData.length === 0) {
      const snapshot = await getDocs(collection(this.firestore, 'messages'));
      const loadedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.convertToDate(doc.data()['timestamp']),
      }));
      this.messagesData = loadedMessages;
    }
    const currentUserId = this.global.currentUserData?.id;
    const currentUserName = this.global.currentUserData?.name;
    this.messagesData = this.messagesData.map((msg: any) => {
      const foundSender = this.allUsersFromDb.find(
        (user) => user.id === msg.senderId
      );
      const foundRecipient = this.allUsersFromDb.find(
        (user) => user.id === msg.recipientId
      );
      if (foundSender) {
        msg.senderName = foundSender.name;
        msg.senderPicture = foundSender.picture;
      }
      if (foundRecipient) {
        msg.recipientName = foundRecipient.name;
        msg.recipientPicture = foundRecipient.picture;
      }
      return msg;
    });
    this.messagesData = [...this.messagesData];
    this.cdr.detectChanges();
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
    this.currentMessage = null;
  }

  trackByMessageId(index: number, message: any): string {
    return message.id;
  }

  openEmojiPicker(event: MouseEvent, message: any) {
    event.stopPropagation();
    this.currentMessage = message;
    this.isEmojiPickerVisibleEdit = false;
    this.isEmojiPickerVisible = true;
    this.isOverlayOpen = true;
  }

  openEmojiPickerEdit(event: MouseEvent) {
    event.stopPropagation();
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
    this.editWasClicked = true;
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
    return !isSameDay(
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
    if (isSameDay(messageDate, today)) {
      return 'Heute';
    } else if (isSameDay(messageDate, yesterday)) {
      return 'Gestern';
    } else {
      return formatDate(messageDate);
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedUser'] && this.selectedUser) {
      await this.getMessages();
      this.chatMessage = '';
      this.global.clearCurrentChannel();
    }
    if (changes['selectedChannel'] && this.selectedChannel) {
      this.clearInput();
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
    const regex = /@(\S+)/g;
    const normalizedUserNames = this.getAllUsersName.map(
      (user: any) => user.name?.trim().toLowerCase() || ''
    );
    const formattedText = text.replace(regex, (match) => {
      let mentionName = match.substring(1).toLowerCase().trim();
      mentionName = mentionName.split(' ')[0];
      if (normalizedUserNames.includes(mentionName)) {
        return `<span class="mention">@${mentionName}</span>`;
      } else {
        return match;
      }
    });
    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }

  clearInput() {
    this.messagesData = [];
  }
  async saveOrDeleteMessage(message: any) {
    this.shouldScroll = false;
    if (!message.id) return;
  
    const messageRef = doc(this.firestore, 'messages', message.id);
  
    if (this.editableMessageText.trim() === '') {
      // Nachricht soll gelöscht werden
      try {
        const docSnapshot = await getDoc(messageRef);
        if (!docSnapshot.exists()) return;
  
        await deleteDoc(messageRef);
  
        const index = this.messagesData.findIndex((msg: any) => msg.id === message.id);
        if (index !== -1) {
          this.messagesData[index] = {
            ...this.messagesData[index],
            deleted: true
          };
        } else {
          this.messagesData.push({
            id: message.id,
            deleted: true
          });
        }
  
        this.threadControlService.setEditedMessage({ id: message.id, deleted: true });
        this.editMessageId = null;
        this.isFirstClick = true;
        this.checkEditbox = false;
      } catch (error) {
        console.error(`Fehler beim Löschen der Nachricht (ID: ${message.id}):`, error);
      }
    } else {
      // Nachricht soll bearbeitet werden
      try {
        const docSnapshot = await getDoc(messageRef);
        if (!docSnapshot.exists()) return;
  
        const editMessage = {
          text: this.editableMessageText,
          editedTextShow: true,
          editedAt: new Date().toISOString(),
        };
  
        await updateDoc(messageRef, editMessage);
  
        const index = this.messagesData.findIndex((msg: any) => msg.id === message.id);
        if (index !== -1) {
          this.messagesData[index] = {
            ...this.messagesData[index],
            ...editMessage,
          };
        } else {
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
        console.error(`Fehler beim Bearbeiten der Nachricht (ID: ${message.id}):`, error);
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
    if (!this.selectedUser?.id || !this.global.currentUserData?.id) return;
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
    onSnapshot(q, async (querySnapshot) => {
      let newMessageArrived = false;
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          newMessageArrived = true;
        }
      });
      this.messagesData = querySnapshot.docs.map((docSnap: any) => {
        const data = docSnap.data();
        if (data.timestamp?.seconds) {
          data.timestamp = new Date(data.timestamp.seconds * 1000);
        } else if (data.timestamp?.toDate) {
          data.timestamp = data.timestamp.toDate();
        } else {
          data.timestamp = new Date();
        }
        const sender = this.allUsersFromDb.find((u) => u.id === data.senderId);
        if (sender) {
          data.senderName = sender.name;
          data.senderPicture = sender.picture;
        } else {
          console.warn(`⚠️ Kein Nutzer gefunden für senderId ${data.senderId}`);
          data.senderName = 'Gelöschter Nutzer';
          data.senderPicture = 'assets/img/default-avatar.png';
        }
        const recipient = this.allUsersFromDb.find(
          (u) => u.id === data.recipientId
        );
        if (recipient) {
          data.recipientName = recipient.name;
          data.recipientPicture = recipient.picture;
        } else {
          data.recipientName = 'Gelöschter Nutzer';
          data.recipientPicture = 'assets/img/default-avatar.png';
        }
        data.formattedText = this.formatMentions(data.text);
        return { id: docSnap.id, ...data };
      });
      this.messagesData.sort((a: any, b: any) => a.timestamp - b.timestamp);
      if (newMessageArrived) {
        setTimeout(() => {
          this.scrollAutoDown();
        }, 100);
      }
      await this.updateMessagesWithNewPhoto();
      this.updateSubscriptionText();
      this.dataLoaded = true;
      await this.subscribeToThreadAnswers();
    });
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
      this.global.setThreadOpened(true);
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
  }

  splitMessage(text: string): string[] {
    const mentionRegex = /(@[\w\-\*_!$]+)/g;
    const parts = text.split(mentionRegex);
    return parts.map((p) => p.trim()).filter((p) => p.length > 0);
  }

  isMention(textPart: string): boolean {
    if (!textPart.startsWith('@')) {
      return false;
    }
    const mentionName = textPart.substring(1).toLowerCase().trim();
    const normalizedUserNames = this.getAllUsersName.map((user: any) =>
      (user.username ?? '').toLowerCase().trim()
    );
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
          return;
        }
        this.handleMentionClick(mentionName);
      }
    }
  }

  async handleMentionClick(mention: string) {
    this.wasClickedChatInput = true;
    const cleanName = mention.substring(1).trim().toLowerCase();
    const user = await this.mentionService.ensureUserDataLoaded(cleanName);
    if (!user) {
      return;
    }
    this.global.getUserByName = user;
    this.global.openMentionMessageBox = true;
  }

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const height = (textarea.scrollTop = textarea.scrollHeight);
    this.scrollHeightInput = height;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const reactPicker =
      this.elementRef.nativeElement.querySelector('.react-picker');
    const editPicker =
      this.elementRef.nativeElement.querySelector('.edit-picker');

    const isReactPickerClicked = reactPicker && reactPicker.contains(target);
    const isEditPickerClicked = editPicker && editPicker.contains(target);
    if (!isReactPickerClicked && !isEditPickerClicked) {
      this.isEmojiPickerVisible = false;
      this.isEmojiPickerVisibleEdit = false;
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

  async addEmoji(event: any) {
    if (!this.currentMessage) {
      console.error('Kein currentMessage gesetzt!');
      return;
    }
    if (!event.emoji || !event.emoji.native) {
      return;
    }
    const emoji = event.emoji.native;
    this.shouldScroll = false;
    const currentUserIsSender =
      this.global.currentUserData?.id === this.currentMessage.senderId;
    let updatedMessage: any;
    if (currentUserIsSender) {
      updatedMessage = {
        ...this.currentMessage,
        senderchoosedStickereBackColor: emoji,
        stickerBoxCurrentStyle: true,
        senderSticker: this.currentMessage.senderSticker === emoji ? '' : emoji,
        senderStickerCount: this.currentMessage.senderSticker === emoji ? 0 : 1,
      };
    } else {
      updatedMessage = {
        ...this.currentMessage,
        recipientChoosedStickerBackColor: emoji,
        stickerBoxCurrentStyle: true,
        recipientSticker:
          this.currentMessage.recipientSticker === emoji ? '' : emoji,
        recipientStickerCount:
          this.currentMessage.recipientSticker === emoji ? 0 : 1,
      };
    }
    this.isEmojiPickerVisible = false;
    this.messageIdHovered = null;
    const docRef = doc(this.firestore, 'messages', updatedMessage.id);
    try {
      await updateDoc(docRef, {
        senderSticker: updatedMessage.senderSticker,
        senderStickerCount: updatedMessage.senderStickerCount,
        recipientSticker: updatedMessage.recipientSticker,
        recipientStickerCount: updatedMessage.recipientStickerCount,
        senderchoosedStickereBackColor:
          updatedMessage.senderchoosedStickereBackColor,
        recipientChoosedStickerBackColor:
          updatedMessage.recipientChoosedStickerBackColor,
        stickerBoxCurrentStyle: updatedMessage.stickerBoxCurrentStyle,
        stickerBoxOpacity: updatedMessage.stickerBoxOpacity,
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Dokuments:', error);
    }
    const index = this.messagesData.findIndex(
      (m: any) => m.id === updatedMessage.id
    );
    if (index !== -1) {
      this.messagesData = [
        ...this.messagesData.slice(0, index),
        updatedMessage,
        ...this.messagesData.slice(index + 1),
      ];
    }
    this.currentMessage = null;
    this.closePicker();
  }

  async emojiSender(message: any) {
    this.wasRemoved = false;
    if (message.senderSticker) {
      this.currentMessage = message;
      const event = { emoji: { native: message.senderSticker } };
      await this.addEmoji(event);
    }
    message.stickerBoxCurrentStyle = true;
  }

  async emojirecipient(message: any) {
    this.wasRemoved = false;
    if (message.recipientSticker) {
      this.currentMessage = message;
      const event = { emoji: { native: message.recipientSticker } };
      await this.addEmoji(event);
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
