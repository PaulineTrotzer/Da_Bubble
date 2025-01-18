import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from '@angular/fire/firestore';
import { GlobalVariableService } from '../services/global-variable.service';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { Auth, getAuth } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { OverlayStatusService } from '../services/overlay-status.service';
import { MentionMessageBoxComponent } from '../mention-message-box/mention-message-box.component';
import { UserChannelSelectService } from '../services/user-channel-select.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Message {
  formattedText: any;
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  senderName: string;
  senderPicture: string;
  reactions: { [emoji: string]: string[] };
  selectedFiles?: any[];
  isEdited: boolean;
}

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    CommonModule,
    PickerComponent,
    FormsModule,
    MentionMessageBoxComponent,
  ],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-50%)' }),
        animate(
          '150ms ease-in-out',
          style({ opacity: 100, transform: 'translateX(0)' })
        ),
      ]),
      transition(':enter', [
        style({ opacity: 100, transform: 'translateX(0)' }),
        animate(
          '150ms ease-in-out',
          style({ opacity: 0, transform: 'translateX(-50%)' })
        ),
      ]),
    ]),
  ],
})
export class ChannelChatComponent implements OnInit, AfterViewInit {
  isEdited = false;
  @Input() inputMessagesData: any[] = [];
  @Input() selectedChannel: any;
  firestore = inject(Firestore);
  global = inject(GlobalVariableService);
  messagesData: Message[] = [];
  showThreadInfo: boolean = false;
  showEditDialog: string | null = null;
  showEditArea: string | null = null;
  hoveredMessageId: string | null = null;
  hoveredReactionMessageId: string | null = null;
  reactionUserNames: { [userId: string]: string } = {};
  hoveredEmoji: string | null = null;
  isPickerVisible: string | null = null;
  editingMessageId: string | null = null;
  currentUserLastEmojis: string[] = [];
  messageToEdit: string = '';
  getAllUsersName: any[] = [];
  unsubscribe: (() => void) | undefined;
  wasClickedInChannelInput: boolean = false;
  @Output() enterChatFromChannel = new EventEmitter<any>();
  globalService = inject(GlobalVariableService);
  @Output() headerUpdate: EventEmitter<any> = new EventEmitter<any>();
  clicked = false;
  overlayStatusService = inject(OverlayStatusService);
  auth = inject(Auth);
  cdr = inject(ChangeDetectorRef);
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  shouldScroll = true;
  userChannelSelectService = inject(UserChannelSelectService);
  sanitizer = inject(DomSanitizer);

  constructor(private elRef: ElementRef) {}

  async ngOnInit(): Promise<void> {
    await this.loadChannelMessages();
    await this.loadCurrentUserEmojis();
    await this.getAllUsersname();
    await this.loadUserNames();
    document.addEventListener(
      'click',
      this.closePickerIfClickedOutside.bind(this)
    );
    this.userChannelSelectService.selectedChannel$.subscribe((channel) => {
      console.log('selectedChannel (channel):', channel);
      this.selectedChannel = channel;
    });
  }

  ngAfterViewInit() {
    /*     this.scrollToBottom(); */
  }

  scrollToBottom(): void {
    if (this.messageContainer && this.messageContainer.nativeElement) {
      const container = this.messageContainer.nativeElement;
      const lastMessage = container.querySelector(
        '.message-container:last-child'
      );
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }
  async ngOnChanges(changes: SimpleChanges) {
    if (changes['inputMessagesData'] && this.inputMessagesData.length > 0) {
      console.log('Input Nachrichten geändert:', this.inputMessagesData);
      this.messagesData = this.inputMessagesData;
      this.shouldScroll = true;
      this.loadUserNames();
    }
    if (changes['selectedChannel'] && this.selectedChannel) {
      debugger;
      this.shouldScroll = true;
      await this.loadChannelMessages();
    }
  }

  closePickerIfClickedOutside(event: MouseEvent) {
    const emojiPickerContainer = this.elRef.nativeElement.querySelector(
      '.emoji-picker-container'
    );
    if (emojiPickerContainer && !emojiPickerContainer.contains(event.target)) {
      this.closeEmojiPicker(event);
    }
  }

  onCancelMessageBox(): void {
    this.wasClickedInChannelInput = false;
  }

  enterChatByUserName(user: any) {
    this.enterChatFromChannel.emit(user);
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

  async handleMentionClick(mention: string) {
    this.wasClickedInChannelInput = true;
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
    this.wasClickedInChannelInput = false;
  }

  splitMessage(text: string): string[] {
    const regex = /(@[\w\-_!$*]+)/g;
    const parts = text.split(regex);
    const cleanedParts = parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    return cleanedParts;
  }
  isMention(text: string): boolean {
    const regex = /^@[\w\-_!$*]+$/;
    const isMention = regex.test(text.trim());
    return isMention;
  }

  async loadUserNames() {
    try {
      const auth = getAuth();
      const userDocs = await Promise.all(
        this.messagesData
          .flatMap((message) => {
            console.log('Message Reactions:', message.reactions);
            return Object.values(message.reactions || {})
              .flat()
              .filter((userId) => userId !== auth.currentUser?.uid);
          })
          .filter((userId, index, self) => self.indexOf(userId) === index)
          .map((userId) => {
            return getDoc(doc(this.firestore, 'users', userId));
          })
      );
      userDocs.forEach((doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          if (userData?.['name']) {
            this.reactionUserNames[doc.id] = userData['name'];
          }
        } else {
          console.log(`No user found for ID: ${doc.id}`);
        }
      });
    } catch (error) {
      console.error('Error loading user names:', error);
    }
  }

  async loadChannelMessages() {
    if (!this.selectedChannel) {
      console.warn('No channel selected');
      return;
    }
  
    const messagesRef = collection(
      this.firestore,
      'channels',
      this.selectedChannel.id,
      'messages'
    );
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    onSnapshot(q, (querySnapshot: any) => {
      this.messagesData = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.seconds) {
          data.timestamp = new Date(data.timestamp.seconds * 1000);
        }
        data.formattedText = this.formatMentions(data.text);
  
        return { id: doc.id, ...data };
      });
    });
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

  async updateMessagesWithNewPhoto() {
    try {
      const newPhotoUrl = this.global.currentUserData?.picture;
      if (!newPhotoUrl) {
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
          'channels',
          this.selectedChannel.id,
          'messages',
          message.id
        );
        return updateDoc(messageRef, { photoUrl: newPhotoUrl });
      });
      await Promise.all(updatePromises);
      console.log('Firestore-Updates abgeschlossen');
    } catch (error) {
      console.error(
        'Fehler beim Aktualisieren der Nachrichten mit neuem Foto:',
        error
      );
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    document.removeEventListener(
      'click',
      this.closePickerIfClickedOutside.bind(this)
    );
  }

  openEmojiPicker(messageId: string) {
    this.isPickerVisible = messageId;
    this.overlayStatusService.setOverlayStatus(true);
    this.clicked = true;
    this.editingMessageId = null;
  }

  openEmojiPickerEdit(messageId: string) {
    this.isPickerVisible = messageId;
    this.overlayStatusService.setOverlayStatus(true);
    this.clicked = true;
    this.editingMessageId = messageId;
  }

  closeEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.overlayStatusService.setOverlayStatus(false);
    this.clicked = false;
    this.editingMessageId = null;
    this.isPickerVisible = null;
  }

  async addLastUsedEmoji(emoji: any) {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;
    if (currentUserId) {
      const docRef = doc(this.firestore, 'users', currentUserId);
      await updateDoc(docRef, {
        lastEmojis: [
          emoji.native,
          ...(await this.getExistingEmojis(docRef)),
        ].slice(0, 2),
      });
    }
  }

  async getExistingEmojis(userDocRef: DocumentReference): Promise<string[]> {
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    return userData?.['lastEmojis'] || [];
  }

  async loadCurrentUserEmojis() {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;

    if (currentUserId) {
      const userDocRef = doc(this.firestore, 'users', currentUserId);

      onSnapshot(userDocRef, (docSnapshot) => {
        const userData = docSnapshot.data();
        if (userData?.['lastEmojis']) {
          this.currentUserLastEmojis = userData['lastEmojis'];
        }
      });
    } else {
      console.warn('No current user logged in');
    }
  }

  async removeReaction(emoji: string, messageId: string) {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) {
      console.warn('No current user logged in');
      return;
    }

    const messageDocRef = doc(
      this.firestore,
      'channels',
      this.selectedChannel.id,
      'messages',
      messageId
    );

    try {
      const messageSnapshot = await getDoc(messageDocRef);
      const messageData = messageSnapshot.data();
      const reactions = messageData?.['reactions'] || {};

      if (reactions[emoji] && reactions[emoji].includes(currentUserId)) {
        reactions[emoji] = reactions[emoji].filter(
          (userId: string) => userId !== currentUserId
        );

        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }

        await updateDoc(messageDocRef, { reactions });

        console.log(`Updated reactions for message ${messageId}:`, reactions);
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }

  addEmojiToMessage(emoji: string, messageId: string) {
    if (this.editingMessageId === messageId) {
      // Append emoji to the message being edited
      this.messageToEdit += emoji;
    } else {
      // Existing reaction logic
      const auth = getAuth();
      const currentUserId = auth.currentUser?.uid;

      if (!currentUserId) {
        console.warn('No current user logged in');
        return;
      }

      const messageDocRef = doc(
        this.firestore,
        'channels',
        this.selectedChannel.id,
        'messages',
        messageId
      );

      getDoc(messageDocRef).then((messageSnapshot) => {
        const messageData = messageSnapshot.data();
        const reactions = messageData?.['reactions'] || {};

        let oldReaction: string | null = null;
        for (const [reactionEmoji, userIds] of Object.entries(reactions)) {
          if ((userIds as string[]).includes(currentUserId)) {
            oldReaction = reactionEmoji;
            break;
          }
        }

        if (oldReaction === emoji) {
          reactions[emoji] = reactions[emoji].filter(
            (userId: string) => userId !== currentUserId
          );
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          if (oldReaction) {
            reactions[oldReaction] = reactions[oldReaction].filter(
              (userId: string) => userId !== currentUserId
            );
            if (reactions[oldReaction].length === 0) {
              delete reactions[oldReaction];
            }
          }

          if (!reactions[emoji]) {
            reactions[emoji] = [];
          }
          reactions[emoji].push(currentUserId);
        }

        updateDoc(messageDocRef, { reactions }).catch((error) => {
          console.error('Error updating reactions:', error);
        });
      });
    }

    this.isPickerVisible = null;
    this.overlayStatusService.setOverlayStatus(false);
  }

  closePicker(event: MouseEvent) {
    event.stopPropagation();

    this.isPickerVisible = null;
    this.clicked = false;
  }

  onPickerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  letPickerVisible(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isPickerVisible = messageId;
    this.overlayStatusService.setOverlayStatus(true);
  }

  hasReactions(reactions: { [emoji: string]: string[] }): boolean {
    return reactions && Object.keys(reactions).length > 0;
  }

  openThread(messageId: string) {
    this.global.setChannelThread(messageId);
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

  displayDayInfo(index: number): boolean {
    if (index === 0) return true;
    const currentMessage = this.messagesData[index];
    const previousMessage = this.messagesData[index - 1];
    return !this.isSameDay(
      new Date(currentMessage.timestamp),
      new Date(previousMessage.timestamp)
    );
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
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

  toggleEditDialog(messageId: string) {
    this.showEditDialog = this.showEditDialog === messageId ? null : messageId;
  }

  toggleEditArea(messageId: string, messageText: string) {
    if (this.showEditArea === messageId) {
      this.showEditArea = null;
      this.messageToEdit = '';
    } else {
      this.showEditArea = messageId;
      this.messageToEdit = messageText;
      this.isEdited = true;
      this.toggleEditDialog(messageId);
    }
  }

  async saveEditedMessage(messageId: string) {
    this.shouldScroll = false;
    try {
      const messageDocRef = doc(
        this.firestore,
        'channels',
        this.selectedChannel.id,
        'messages',
        messageId
      );

      if (this.messageToEdit.trim() === '') {
        await deleteDoc(messageDocRef);
      } else {
        await updateDoc(messageDocRef, {
          text: this.messageToEdit,
          isEdited: true,
        });
      }
      this.showEditArea = null;
      this.messageToEdit = '';
    } catch (error) {
      console.error('Error saving edited message:', error);
    }
  }

  cancelEdit() {
    this.showEditArea = null;
    this.messageToEdit = '';
  }

  getReactionText(message: Message, emoji: string | null): string {
    if (!emoji || !message.reactions) return '';

    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid || '';
    const reactors = message.reactions[emoji] || [];

    if (reactors.length === 0) return '';

    const currentUserReacted = reactors.includes(currentUserId);
    const otherReactors = reactors.filter((userId) => userId !== currentUserId);

    if (currentUserReacted && reactors.length === 1) {
      return 'Du hast reagiert.';
    }

    if (currentUserReacted && otherReactors.length > 0) {
      const otherUserName =
        this.reactionUserNames[otherReactors[0]] || 'Jemand';
      return `${otherUserName} und Du haben reagiert.`;
    }

    const firstReactorName = this.reactionUserNames[reactors[0]] || 'Jemand';
    return `${firstReactorName} hat reagiert.`;
  }

  onReactionHover(message: Message, emoji: string) {
    this.hoveredReactionMessageId = message.id;
    this.hoveredEmoji = emoji;

    const auth = getAuth();
    const reactors = message.reactions[emoji] || [];
    const unknownUsers = reactors
      .filter((userId) => userId !== auth.currentUser?.uid)
      .filter((userId) => !this.reactionUserNames[userId]);

    if (unknownUsers.length > 0) {
      Promise.all(
        unknownUsers.map(async (userId) => {
          const userDoc = await getDoc(doc(this.firestore, 'users', userId));
          const userData = userDoc.data();
          if (userData?.['name']) {
            this.reactionUserNames[userId] = userData['name'];
          }
        })
      );
    }
  }
}
