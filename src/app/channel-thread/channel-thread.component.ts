import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {
  collection,
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
import { OverlayStatusService } from '../services/overlay-status.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { MentionMessageBoxComponent } from '../mention-message-box/mention-message-box.component';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  senderName: string;
  senderPicture: string;
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
  overlayStatusService = inject(OverlayStatusService);
  topicMessage: Message | null = null;
  messages: Message[] = [];
  isChannelThreadOpen: boolean = false;
  isPickerVisible: string | null = null;
  showEditDialog: string | null = null;
  showEditArea: string | null = null;
  hoveredMessageId: string | null = null;
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

  constructor() {}

  async ngOnInit(): Promise<void> {
    this.global.channelThread$.subscribe(async (threadId) => {
      if (threadId) {
        this.channelMessageId = threadId;
        await this.getTopic();
        await this.loadThreadMessages();
        this.toggleChannelThread(true);
        await this.loadCurrentUserEmojis();
        await this.getAllUsersname();
      }
    });
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

  splitMessage(text: string) {
    const regex = /(@[\w\-_!$*]+(?:\s[\w\-_!$*]+)?)/g;
    return text?.split(regex);
  }

  isMention(part: string): boolean {
    if (!part.startsWith('@')) {
      return false;
    }
    const mentionName = part.substring(1);
    return this.getAllUsersName.some((user) => user.userName === mentionName);
  }

  async handleMentionClick(mention: string) {
    this.wasClickedInChannelThread = true;
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
      console.log('No message selected!');
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
    onSnapshot(q, (querySnapshot: any) => {
      this.messages = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.seconds) {
          data.timestamp = new Date(data.timestamp.seconds * 1000);
        }
        return { id: doc.id, ...data };
      });
    });
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

  async addEmoji(event: any, messageId: string) {
    const emoji = event.emoji;
    this.isPickerVisible = null;
    await this.addLastUsedEmoji(emoji);
    await this.addToReactionInfo(emoji, messageId);
  }

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

/*   togglePicker(messageId: string) {
    if (this.isPickerVisible === messageId) {
      this.isPickerVisible = null;
      this.visiblePickerValue = false;
      this.overlayStatusService.setOverlayStatus(false);
    } else {
      this.isPickerVisible = messageId;
      this.visiblePickerValue = true;
      this.editingMessageId = messageId;
      this.overlayStatusService.setOverlayStatus(true);
    }
  } */

  letPickerVisible(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isPickerVisible = messageId;
    this.visiblePickerValue = true;
    this.isClicked = true;
    this.overlayStatusService.setOverlayStatus(true);
  }

  letPickerEditVisible(event: MouseEvent, messageId: string) {
    console.log("Clicked:", messageId);
    this.isClickedEdit = true;
    this.overlayStatusService.setOverlayStatus(true);
    this.showEditArea = messageId;
  }

  openEmojiPicker(messageId: string) {
    this.visiblePickerValue = true;
    this.isPickerVisible = messageId;
    this.overlayStatusService.setOverlayStatus(true);
    this.isClicked = true;
    this.editingMessageId = null;
  }

  openEmojiPickerEdit(messageId: string) {
    this.isPickerVisible = messageId;
    this.visiblePickerValue = true;
    this.overlayStatusService.setOverlayStatus(true);
    this.isClicked = true;
    this.editingMessageId = messageId;
  }

  closeEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.overlayStatusService.setOverlayStatus(false);
    this.isClicked = false;
    this.editingMessageId = null;
    this.isPickerVisible = null;
    this.isClickedEdit = false;
  }

  closePicker() {
    this.isPickerVisible = null;
    this.visiblePickerValue = false;
    this.overlayStatusService.setOverlayStatus(false);
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

    if (this.editingMessageId === messageId) {
      this.messageToEdit += emoji;
    } else if (currentUserId) {
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
            this.hoveredReactionMessageId = null;
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

        updateDoc(messageDocRef, { reactions });
      });
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

  toggleEditDialog(messageId: string) {
    this.showEditDialog = this.showEditDialog === messageId ? null : messageId;
  }

  cancelEdit() {
    this.showEditArea = null;
    this.messageToEdit = '';
  }

  async saveEditedMessage(messageId: string) {
    try {
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
      await updateDoc(messageDocRef, {
        text: this.messageToEdit,
        isEdited: true,
      });
      this.showEditArea = null;
      this.messageToEdit = '';

      console.log(`Message ${messageId} updated successfully.`);
    } catch (error) {
      console.error('Error saving edited message:', error);
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
