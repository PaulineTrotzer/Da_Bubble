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
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { InputFieldComponent } from '../input-field/input-field.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { getAuth } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { MentionMessageBoxComponent } from '../mention-message-box/mention-message-box.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MentionThreadService } from '../services/mention-thread.service';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  senderName: string;
  senderPicture: string;
  selectedFiles?: any[];
  reactions: { [emoji: string]: string[] };
  isEdited: boolean;
}

@Component({
  selector: 'app-channel-thread',
  standalone: true,
  imports: [
    CommonModule,
    InputFieldComponent,
    PickerComponent,
    FormsModule,
    MentionMessageBoxComponent,
  ],
  templateUrl: './channel-thread.component.html',
  styleUrl: './channel-thread.component.scss',
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
export class ChannelThreadComponent implements OnInit {
  visiblePickerValue = false;
  channelMessageId: any;
  @Input() selectedChannel: any;
  firestore = inject(Firestore);
  db = inject(Firestore);
  global = inject(GlobalVariableService);
  auth = inject(AuthService);
  topicMessage: Message | null = null;
  messages: Message[] = [];
  isChannelThreadOpen: boolean = false;
  isPickerVisible: string | null = null;
  showEditDialog: string | null = null;
  showEditArea: string | null = null;
  hoveredMessageId: string | null | undefined;
  hoveredTopic: boolean = false;
  currentUserLastEmojis: string[] = [];
  hoveredReactionMessageId: string | null = null;
  hoveredEmoji: string | null = null;
  editingMessageId: string | null = null;
  reactionUserNames: { [userId: string]: string } = {};
  messageToEdit: string = '';
  unsubscribe: (() => void) | undefined;
  @Output() userSelectedFromChannelThread = new EventEmitter<any>();
  @Output() userSelectedFromMentionMessagebox = new EventEmitter<any>();
  @Output() enterChatUser = new EventEmitter<any>();
  wasClickedInChannelThread = false;
  getAllUsersName: any[] = [];
  isClicked = false;
  isClickedEdit = false;
  isClickedEditAnswers = false;
  threadMessageId: string | null = null;
  cdr = inject(ChangeDetectorRef);
  @ViewChild(InputFieldComponent) inputFieldComponent!: InputFieldComponent;
  sanitizer = inject(DomSanitizer);
  isOverlayOpen = false;
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  mentionService = inject(MentionThreadService);
  constructor() {}

  async ngOnInit(): Promise<void> {
    await this.mentionService.getAllUsersname();
    this.global.channelThread$.subscribe(async (threadId) => {
      if (threadId) {
        this.channelMessageId = threadId;
        this.threadMessageId = threadId;
        await this.getTopic();
        await this.loadThreadMessages();
        this.toggleChannelThread(true);
        await this.loadCurrentUserEmojis();
      }
    });
    this.scrollOrNot('yes');
  }

  displayDayInfo(index: number): boolean {
    if (index === 0) return true;
    const currentMessage = this.messages[index];
    const previousMessage = this.messages[index - 1];
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
    const messageDate = new Date(this.messages[index].timestamp);
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


  scrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    }
  }

  getReplyCountText(): string {
    const replyCount = this.messages.length;

    if (replyCount === 1) {
      return '1 Antwort';
    } else if (replyCount > 1) {
      return `${replyCount} Antworten`;
    } else {
      return 'Keine Antworten';
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

  async handleMentionClick(mention: string) {
    this.wasClickedInChannelThread = true;
    const cleanName = mention.substring(1).trim().toLowerCase();
    const user = await this.mentionService.ensureUserDataLoaded(cleanName);
    if (!user) {
      return;
    }
    this.global.getUserByName = user;
    this.global.openMentionMessageBox = true;
  }

  closeMentionBoxHandler() {
    this.wasClickedInChannelThread = false;
  }

  selectUserForChat(user: any) {
    this.userSelectedFromChannelThread.emit(user);
  }

  onCancelMessageBox(): void {
    this.wasClickedInChannelThread = false;
  }

  enterChatByUserName(user: any) {
    this.enterChatUser.emit(user);
    this.wasClickedInChannelThread = false;
  }

  onMentionMessageboxClick(user: any) {
    this.userSelectedFromMentionMessagebox.emit(user);
  }

  toggleChannelThread(status: boolean) {
    this.isChannelThreadOpen = status;
  }

  async getTopic() {
    return new Promise<void>((resolve) => {
      const docRef = doc(
        this.db,
        'channels',
        this.selectedChannel.id,
        'messages',
        this.channelMessageId
      );
      onSnapshot(docRef, (doc) => {
        const data = doc.data();
        if (data) {
          if (data['timestamp']?.seconds) {
            data['timestamp'] = new Date(data['timestamp'].seconds * 1000);
          }
          this.topicMessage = { ...data, id: this.channelMessageId } as Message;
          resolve();
        }
      });
    });
  }

  async loadThreadMessages() {
    if (!this.channelMessageId) {
      return;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    const messagesRef = collection(
      this.db,
      'channels',
      this.selectedChannel.id,
      'messages',
      this.channelMessageId,
      'thread'
    );
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    onSnapshot(q, async (snapshot) => {
      let newMessageArrived = false;
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          newMessageArrived = true;
        }
      });
      this.messages = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        if (data.timestamp?.seconds) {
          data.timestamp = new Date(data.timestamp.seconds * 1000);
        }
        data.formattedText = this.formatMentions(data.text);
        if (data.isEdited === undefined) {
          data.isEdited = false;
        }
        return { id: doc.id, ...data };
      });
      if (newMessageArrived) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 50);
      }
      await this.updateMessagesWithNewPhoto();
    });
  }

  scrollOrNot(command: string) {
    if (command === 'yes') {
      setTimeout(() => this.scrollToBottom(), 50);
    } else {
      return;
    }
  }

  async updateMessagesWithNewPhoto() {
    try {
      const newPhotoUrl = this.global.currentUserData?.picture;
      if (!newPhotoUrl) {
        console.warn('Keine neue Foto-URL verfügbar');
        return;
      }
      await this.updateMessagePhoto(this.topicMessage, newPhotoUrl);
      const messagesToUpdate = this.messages.filter(
        (message) =>
          message.senderId === this.global.currentUserData.id &&
          message.senderPicture !== newPhotoUrl
      );
      if (messagesToUpdate.length > 0) {
        messagesToUpdate.forEach(
          (message) => (message.senderPicture = newPhotoUrl)
        );
        this.messages = [...this.messages];
        this.cdr.detectChanges();
        await Promise.all(
          messagesToUpdate.map((message) =>
            this.updateMessagePhoto(message, newPhotoUrl)
          )
        );
      }
    } catch (error) {
      console.error(
        'Fehler beim Aktualisieren der Nachrichten mit neuem Foto:',
        error
      );
    }
  }

  private async updateMessagePhoto(message: any, newPhotoUrl: string) {
    if (
      message &&
      message.senderId === this.global.currentUserData.id &&
      message.senderPicture !== newPhotoUrl
    ) {
      message.senderPicture = newPhotoUrl;
      const messageRef = doc(
        this.firestore,
        'channels',
        this.selectedChannel.id,
        'messages',
        message.id
      );
      await updateDoc(messageRef, { photoUrl: newPhotoUrl });
    }
  }

  closeThread() {
    this.global.channelThreadSubject.next(null);
    this.hiddenThreadFullBox();
    this.checkResponsiveWidtSize();
  }

  hiddenThreadFullBox() {
    if (
      window.innerWidth <= 1349 &&
      window.innerWidth > 720 &&
      this.global.checkWideChannelOrUserThreadBox
    ) {
      this.global.checkWideChannelOrUserThreadBox = false;
      this.global.checkWideChannelorUserBox = true;
    }
  }
  checkResponsiveWidtSize() {
    if (window.innerWidth <= 720 && this.global.openChannelOrUserThread)
      this.global.openChannelOrUserThread = false;
    this.global.openChannelorUserBox = true;
  }

  /*   async addEmoji(event: any, messageId: string) {
    const emoji = event.emoji;
    this.isPickerVisible = null;
    await this.addLastUsedEmoji(emoji);
    await this.addToReactionInfo(emoji, messageId);
  } */

  async addLastUsedEmoji(emoji: any) {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;
    if (currentUserId) {
      const docRef = doc(this.db, 'users', currentUserId);
      await updateDoc(docRef, {
        lastEmojis: [
          emoji.native,
          ...(await this.getExistingEmojis(docRef)),
        ].slice(0, 2),
      });
    }
  }

  async addToReactionInfo(emoji: any, messageId: string) {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) return;

    const messageDocRef =
      messageId === this.topicMessage?.id
        ? doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            this.channelMessageId,
            'thread',
            messageId
          )
        : doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            messageId
          );

    try {
      const messageSnapshot = await getDoc(messageDocRef);
      if (!messageSnapshot.exists()) return;

      const messageData = messageSnapshot.data();
      let reactions = messageData?.['reactions'] || {};

      const hasReacted = Object.values(reactions).some((userIds) =>
        (userIds as string[]).includes(currentUserId)
      );

      if (hasReacted) return;

      if (!reactions[emoji.native]) {
        reactions[emoji.native] = [];
      }

      reactions[emoji.native].push(currentUserId);
      await updateDoc(messageDocRef, { reactions });
    } catch (error) {
      console.error('Error updating reactions:', error);
    }
  }

  async getExistingEmojis(userDocRef: DocumentReference): Promise<string[]> {
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    return userData?.['lastEmojis'] || [];
  }

  letPickerVisible(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isPickerVisible = messageId;
    this.visiblePickerValue = true;
    this.isClicked = true;
    this.isOverlayOpen = true;
  }

  letPickerEditVisible(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isClickedEdit = true;
    this.isOverlayOpen = true;
    this.showEditArea = messageId;
  }

  letPickerEditVisibleForAnswers(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isClickedEditAnswers = true;
    this.isOverlayOpen = true;
    this.showEditArea = messageId;
  }

  openEmojiPickerEditAnswers(messageId: string) {
    this.visiblePickerValue = true;
    this.isClicked = true;
  }

  openEmojiPicker(messageId: string) {
    this.visiblePickerValue = true;
    this.isPickerVisible = messageId;
    this.isOverlayOpen = true;
    this.isClicked = true;
    this.editingMessageId = null;
  }

  openEmojiPickerEdit(messageId: string) {
    this.isPickerVisible = messageId;
    this.visiblePickerValue = true;
    this.isOverlayOpen = true;
    this.isClicked = true;
    this.editingMessageId = messageId;
  }

  closeEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.isOverlayOpen = false;
    this.isClicked = false;
    this.editingMessageId = null;
    this.isPickerVisible = null;
    this.isClickedEdit = false;
  }

  closePicker() {
    this.isPickerVisible = null;
    this.visiblePickerValue = false;
    this.isOverlayOpen = false;
  }

  async removeReaction(emoji: string, messageId: string) {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) return;

    const messageDocRef =
      messageId === this.topicMessage?.id
        ? doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            messageId
          )
        : doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            this.channelMessageId,
            'thread',
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
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }

  hasReactions(reactions: { [emoji: string]: string[] }): boolean {
    return reactions && Object.keys(reactions).length > 0;
  }

  async loadCurrentUserEmojis() {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;

    if (currentUserId) {
      const userDocRef = doc(this.db, 'users', currentUserId);

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
  async addEmojiToMessage(emoji: string, messageId: string) {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;

    // A) Ist man gerade in "Nachricht Bearbeiten"-Modus?
    if (this.editingMessageId === messageId) {
      // Füge das Emoji einfach dem zu bearbeitenden Text an
      this.messageToEdit += emoji;
    }
    // B) Reaktions-Logik
    else if (currentUserId) {
      const isInThread = messageId === this.threadMessageId;
      const messageDocRef = isInThread
        ? doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            messageId
          )
        : doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            this.channelMessageId,
            'thread',
            messageId
          );

      // Dokument holen und Reaction-Update durchführen
      const messageSnapshot = await getDoc(messageDocRef);
      if (messageSnapshot.exists()) {
        const messageData = messageSnapshot.data();
        console.log('Nachricht Daten:', messageData);
        const reactions = messageData?.['reactions'] || {};

        // Prüfen, ob man bereits mit einem anderen Emoji reagiert hat
        let oldReaction: string | null = null;
        for (const [reactionEmoji, userIds] of Object.entries(reactions)) {
          if ((userIds as string[]).includes(currentUserId)) {
            oldReaction = reactionEmoji;
            break;
          }
        }

        // Gleicher Emoji -> Reaction entfernen, sonst Reaction setzen
        if (oldReaction === emoji) {
          // Entfernen
          reactions[emoji] = reactions[emoji].filter(
            (userId: string) => userId !== currentUserId
          );
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          // Alte Reaction löschen (falls vorhanden)
          if (oldReaction) {
            reactions[oldReaction] = reactions[oldReaction].filter(
              (userId: string) => userId !== currentUserId
            );
            if (reactions[oldReaction].length === 0) {
              delete reactions[oldReaction];
            }
          }
          // Neue Reaction hinzufügen
          if (!reactions[emoji]) {
            reactions[emoji] = [];
          }
          reactions[emoji].push(currentUserId);
        }

        await updateDoc(messageDocRef, { reactions });
      } else {
        console.error('Dokument existiert nicht!');
      }
      this.addLastUsedEmoji({ native: emoji });
    }
    this.isPickerVisible = null;
    this.closePicker();
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
          const userDoc = await getDoc(doc(this.db, 'users', userId));
          const userData = userDoc.data();
          if (userData?.['name']) {
            this.reactionUserNames[userId] = userData['name'];
          }
        })
      );
    }
  }

  getReactionText(message: Message, emoji: string | null): string {
    if (!emoji || !message.reactions) return '';

    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid || '';
    const reactors = message.reactions[emoji] || [];
    if (reactors.length === 0) return '';

    const currentUserReacted = reactors.includes(currentUserId);
    const otherReactors = reactors.filter((userId) => userId !== currentUserId);
    let userString = '';
    let verb = '';

    if (currentUserReacted) {
      if (otherReactors.length === 0) {
        userString = 'Du';
        verb = 'hast';
      } else if (otherReactors.length === 1) {
        const otherUser = this.reactionUserNames[otherReactors[0]] || 'Jemand';
        userString = `${otherUser} und Du`;
        verb = 'habt';
      } else {
        const countOthers = otherReactors.length;
        userString = `Du und ${countOthers} andere`;
        verb = 'haben';
      }
    } else {
      if (reactors.length === 1) {
        const userId = reactors[0];
        const userName = this.reactionUserNames[userId] || 'Jemand';
        userString = userName;
        verb = 'hat';
      } else {
        userString = `${reactors.length} Personen`;
        verb = 'haben';
      }
    }
    return `${userString} ${verb} mit ${emoji} reagiert.`;
  }

  toggleEditDialog(messageId: string | null): void {
    // Falls messageId null => schließe den Dialog
    if (!messageId) {
      this.showEditDialog = null;
      return;
    }
    // Andernfalls: Setze showEditDialog auf die ID
    this.showEditDialog = messageId;
  }

  cancelEdit() {
    this.showEditArea = null;
    this.messageToEdit = '';
  }

  getEditedClass(message: any) {
    if (
      message.isEdited &&
      message.senderId !== this.global.currentUserData?.id
    ) {
      return 'edited-indicator-user-display';
    } else if (
      message.isEdited &&
      message.senderId === this.global.currentUserData?.id
    ) {
      return 'edited-indicator';
    }
    return '';
  }

  getEditedClassTopicMessage(topicMessage: any) {
    if (!topicMessage?.isEdited) {
      return '';
    }
    if (topicMessage.senderId === this.global.currentUserData?.id) {
      return 'edited-indicator-topic';
    } else {
      return 'edited-indicator-topic-user-display';
    }
  }

  async saveEditedMessage(messageId: string) {
    try {
      const isTopicMessage = messageId === this.topicMessage?.id;

      const messageDocRef = isTopicMessage
        ? doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            messageId
          )
        : doc(
            this.db,
            'channels',
            this.selectedChannel.id,
            'messages',
            this.channelMessageId,
            'thread',
            messageId
          );
      if (!this.messageToEdit || this.messageToEdit.trim() === '') {
        await deleteDoc(messageDocRef);

        if (isTopicMessage) {
          this.topicMessage = null;
        } else {
          this.messages = this.messages.filter((m) => m.id !== messageId);
        }
      } else {
        await updateDoc(messageDocRef, {
          text: this.messageToEdit.trim(),
          isEdited: true,
        });

        if (isTopicMessage && this.topicMessage) {
          this.topicMessage.text = this.messageToEdit.trim();
          this.topicMessage.isEdited = true;
        } else {
          const idx = this.messages.findIndex((m) => m.id === messageId);
          if (idx !== -1) {
            this.messages[idx].text = this.messageToEdit.trim();
            this.messages[idx].isEdited = true;
          }
        }
      }
      this.showEditArea = null;
      this.messageToEdit = '';
    } catch (error) {
      console.error('Error saving/editing message:', error);
    }
  }

  toggleEditArea(messageId: string, messageText: string) {
    if (this.showEditArea === messageId) {
      this.showEditArea = null;
      this.messageToEdit = '';
    } else {
      this.showEditArea = messageId;
      this.messageToEdit = messageText;
      this.toggleEditDialog(messageId);
    }
  }
}
