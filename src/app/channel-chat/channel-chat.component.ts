import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
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
  getDocs,
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
import { MentionMessageBoxComponent } from '../mention-message-box/mention-message-box.component';
import { UserChannelSelectService } from '../services/user-channel-select.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InputFieldComponent } from '../input-field/input-field.component';
import { InputfieldService } from '../services/inputfield.service';
import { MentionThreadService } from '../services/mention-thread.service';
import { ThreadControlService } from '../services/thread-control.service';
import { formatDate, isSameDay, displayDayInfo } from '../date-utils';
import { Message } from '../channel-message.interface';
import { slideInAnimation } from './component.animation';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    CommonModule,
    PickerComponent,
    FormsModule,
    MentionMessageBoxComponent,
    InputFieldComponent,
  ],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss',
  animations: [slideInAnimation],
})
export class ChannelChatComponent implements OnInit {
  [x: string]: any;
  isEdited = false;
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
  isOverlayOpen = false;
  auth = inject(Auth);
  cdr = inject(ChangeDetectorRef);
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  shouldScroll = true;
  userChannelSelectService = inject(UserChannelSelectService);
  sanitizer = inject(DomSanitizer);
  currentComponentId = 'channels';
  inputFieldService = inject(InputfieldService);
  selectFiles: any[] = [];
  mentionService = inject(MentionThreadService);
  editWasClicked = false;
  replyCounts: Map<string, number> = new Map();
  replyCountValue: number = 0;
  threadControlService = inject(ThreadControlService);
  channelWasLoaded = false;
  EmojiEditclicked = false;
  isNarrowScreen = false;
  firstDayInfoIndex: number | null = null;
  public displayDayInfo = displayDayInfo;
  allUsersFromDb: any[] = [];

  constructor(private elRef: ElementRef) {}

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUserEmojis();
    this.checkEditScreenSize();
    await this.mentionService.getAllUsersname();
    this.allUsersFromDb = await this.getAllUsersname();
    await this.loadUserNames();
    this.userChannelSelectService.selectedChannel$.subscribe((channel) => {
      this.selectedChannel = channel;
      this.loadChannelMessages();
    });
    this.inputFieldService.files$.subscribe((filesByComponent) => {
      this.selectFiles = filesByComponent[this.currentComponentId] || [];
    });
    this.scrollOrNot('yes');
  }

  getUserById(userId: string) {
    return this.allUsersFromDb.find((user) => user.id === userId);
  }
  

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.closeChannelOnSmallScreen();
  }

  findFirstDayInfoIndex() {
    for (let i = 0; i < this.messagesData.length; i++) {
      if (displayDayInfo(this.messagesData, i)) {
        this.firstDayInfoIndex = i;
        break;
      }
    }
  }

  async getAllUsersname(): Promise<any[]> {
    const userRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(userRef);
    const tempArray: any[] = [];
    snapshot.forEach((doc) => {
      const dataUser = doc.data();
      tempArray.push({
        name: dataUser['name'],
        email: dataUser['email'],
        picture: dataUser['picture'] || 'assets/img/default-avatar.png',
        id: doc.id,
        lastUsedEmoji: dataUser['lastUsedEmoji'] || '',
        username: dataUser['username'] || '',
      });
    });
    return tempArray;
  }

  checkEditScreenSize() {
    this.isNarrowScreen = window.innerWidth < 600;
  }

  getReplyCountValue(messageId: string): number {
    return this.replyCounts.get(messageId) ?? 0;
  }

  scrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    }
  }

  scrollOrNot(command: string) {
    if (command === 'yes') {
      setTimeout(() => this.scrollToBottom(), 50);
    } else {
      return;
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedChannel'] && this.selectedChannel) {
      this.shouldScroll = false;
      await this.loadChannelMessages();
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
          return;
        }
        this.handleMentionClick(mentionName);
      }
    }
  }

  async handleMentionClick(mention: string) {
    this.wasClickedInChannelInput = true;
    const cleanName = mention.substring(1).trim().toLowerCase();
    const user = await this.mentionService.ensureUserDataLoaded(cleanName);
    if (!user) {
      return;
    }
    this.global.getUserByName = user;
    this.global.openMentionMessageBox = true;
  }


  closeMentionBoxHandler() {
    this.wasClickedInChannelInput = false;
  }

  async loadUserNames() {
    try {
      const auth = getAuth();
      const userDocs = await Promise.all(
        this.messagesData
          .flatMap((message) => {
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
        }
      });
    } catch (error) {
      console.error('Error loading user names:', error);
    }
  }
  async loadChannelMessages() {
    if (!this.selectedChannel) {
      console.warn('⚠️ Kein Channel ausgewählt');
      return;
    }
  
    // 🔹 Channel Messages Referenz
    const messagesRef = collection(
      this.firestore,
      'channels',
      this.selectedChannel.id,
      'messages'
    );
  
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
    onSnapshot(q, async (querySnapshot) => {
      console.log('📦 Channel Messages Snapshot:', querySnapshot.size);
  
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
        }
  
        data.formattedText = this.formatMentions(data.text);
        console.log('📩 Verarbeite Nachricht', docSnap.id);
        console.log('   ➤ senderId:', data.senderId, ', recipientId:', data.recipientId);
  
        // 🧠 Nutzerinformationen aus lokal geladenem User-Array holen
        const sender = this.allUsersFromDb.find(u => u.id === data.senderId);
        if (sender) {
          data.senderName = sender.name;
          data.senderPicture = sender.picture;
        } else {
          console.warn(`⚠️ Kein Nutzer gefunden für senderId ${data.senderId}`);
        }
  
        if (data.recipientId) {
          const recipient = this.allUsersFromDb.find(u => u.id === data.recipientId);
          if (recipient) {
            data.recipientName = recipient.name;
            data.recipientPicture = recipient.picture;
          }
        }
  
        return { id: docSnap.id, ...data };
      });
  
      // 🔁 Antworten laden
      this.subscribeToThreadAnswers();
  
      // 📜 Nach unten scrollen bei neuer Nachricht
      if (newMessageArrived) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 50);
      }
  
      this.findFirstDayInfoIndex();
      await this.updateMessagesWithNewPhoto();
      this.channelWasLoaded = true;
    });
  }
  

  subscribeToThreadAnswers() {
    this.messagesData.forEach((message) => {
      this.threadControlService
        .getReplyCountChannel(this.selectedChannel.id, message.id)
        .subscribe((count) => {
          this.replyCounts.set(message.id, count);
        });
    });
  }
  formatMentions(text: string): SafeHtml {
    const regex = /@(\S+)/g;
  
    const normalizedUserNames = this.getAllUsersName.map((user: any) => {
      const name = user.name?.trim().toLowerCase() || '';
      return name;
    });
  
    console.log('📌 Normalisierte Usernamen für Mentions:', normalizedUserNames);
    console.log('✉️ Ursprünglicher Text:', text);
  
    const formattedText = text.replace(regex, (match) => {
      let mentionName = match.substring(1).toLowerCase().trim();
      mentionName = mentionName.split(' ')[0];
  
      console.log('🔍 Erkanntes Mention:', mentionName);
  
      if (normalizedUserNames.includes(mentionName)) {
        console.log(`✅ "${mentionName}" erkannt als gültiger Mention-Name`);
        return `<span class="mention">@${mentionName}</span>`;
      } else {
        console.warn(`❌ "${mentionName}" nicht in der Liste. Kein Styling.`);
        return match;
      }
    });
  
    console.log('💡 Formatierter Text mit Mentions:', formattedText);
  
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
        return updateDoc(messageRef, {
          senderPicture: newPhotoUrl,
        });
      });
      await Promise.all(updatePromises);
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
  }

  openEmojiPicker(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isPickerVisible = messageId;
    this.isOverlayOpen = true;
    this.clicked = true;
    this.editingMessageId = null;
  }

  openEmojiPickerEdit(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isPickerVisible = messageId;
    this.isOverlayOpen = true;
    this.EmojiEditclicked = true;
    this.editingMessageId = messageId;
  }

  closeEmojiPicker() {
    this.isOverlayOpen = false;
    this.clicked = false;
    this.editingMessageId = null;
    this.isPickerVisible = null;
  }

  closeEmojiPickerEdit() {
    this.isOverlayOpen = false;
    this.EmojiEditclicked = false;
  }

  editMessageAdd(event: any) {
    const emoji = event.emoji.native;
    this.messageToEdit += emoji;
    this.closeEmojiPickerEdit();
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
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }

  addEmojiToMessage(emoji: string, messageId: string) {
    if (this.editingMessageId === messageId) {
      this.messageToEdit += emoji;
    } else {
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
    this.clicked = false;
    this.isOverlayOpen = false;
    this.shouldScroll = false;
  }

  onPickerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  letPickerVisible(event: MouseEvent, messageId: string) {
    event.stopPropagation();
    this.isPickerVisible = messageId;
    this.isOverlayOpen = true;
  }

  hasReactions(reactions: { [emoji: string]: string[] }): boolean {
    return reactions && Object.keys(reactions).length > 0;
  }

  closeChannelOnSmallScreen() {
    if (
      window.innerWidth <= 950 &&
      this.global.openChannelorUserBox &&
      this.global.openChannelOrUserThread
    ) {
      this.global.openChannelorUserBox = false;
    }
  }

  openThread(messageId: string) {
    this.global.setChannelThread(messageId);
    this.closeChannelOnSmallScreen();
    this.global.setThreadOpened(true);
    if (window.innerWidth < 1350) {
      this.global.openChannelorUserBox = false;
    }
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

  toggleEditDialog(messageId: string | null): void {
    if (!messageId) {
      this.showEditDialog = null;
      return;
    }
    this.showEditDialog = messageId;
  }

  toggleEditArea(messageId: string, messageText: string) {
    this.editWasClicked = false;
    if (this.showEditArea === messageId) {
      this.showEditArea = null;
      this.messageToEdit = '';
    } else {
      this.editWasClicked = true;
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
