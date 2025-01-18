import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Input,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectorRef,
  OnInit,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { GlobalVariableService } from '../services/global-variable.service';
import { PeopleMentionComponent } from '../people-mention/people-mention.component';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  addDoc,
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  increment,
} from '@angular/fire/firestore';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { UserService } from '../services/user.service';
import { ThreadControlService } from '../services/thread-control.service';
import { Subscription } from 'rxjs';
import {
  Storage,
  ref,
  getDownloadURL,
  uploadString,
} from '@angular/fire/storage';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, PickerComponent, PeopleMentionComponent, FormsModule],
  templateUrl: './input-field.component.html',
  styleUrl: './input-field.component.scss',
})
export class InputFieldComponent implements OnInit, OnChanges {
  currentThreadMessageId: string | null = null;
  currentChannelThreadId: string | null = null;
  @Input() isDirectThreadOpen: boolean = false;
  @Input() isChannelThreadOpen: boolean = false;
  @Output() messageSent = new EventEmitter<void>();
  @Input() mentionUser: string = '';
  @Input() selectedUser: any;
  @Input() selectedChannel: any;
  isEmojiPickerVisible: boolean = false;
  chatMessage: string = '';
  global = inject(GlobalVariableService);
  firestore = inject(Firestore);
  selectFiles: any[] = [];
  elementRef = inject(ElementRef);
  @ViewChild('scrollContainer') private scrollContainer: any = ElementRef;
  cdr = inject(ChangeDetectorRef);
  userService = inject(UserService);
  senderStickerCount: number = 0;
  recipientStickerCount: number = 0;
  messagesData: any[] = [];
  formattedChatMessage: any;
  mentionUserName: any[] = [];
  threadControlService = inject(ThreadControlService);
  private subscription: Subscription = new Subscription();
  storage = inject(Storage);
  userId: any;
  route = inject(ActivatedRoute);
  @Output() mentionCardOpened = new EventEmitter<boolean>();
  isMentionPeopleCardVisible: boolean = false;
  isMentionCardOpen: boolean = true;
  @Output() mentionUserOut = new EventEmitter<string>();
  authService=inject(AuthService);
  @ViewChild('inputField', { static: true }) inputFieldRef!: ElementRef<HTMLTextAreaElement>;



  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedUser'] && this.selectedUser?.id) {
    }
  }

  focusInputField(): void {
    if (this.inputFieldRef?.nativeElement) {
      this.inputFieldRef.nativeElement.focus();
    }
  }

  ngOnInit(): void {
    this.authService.initAuthListener();
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId && this.selectedUser?.id) {
    }
    this.getByUserName();
    this.subscription.add(
      this.threadControlService.firstThreadMessageId$.subscribe((messageId) => {
        this.currentThreadMessageId = messageId;
      })
    );
    this.global.currentThreadMessage$.subscribe((messageId) => {
      this.currentThreadMessageId = messageId;
    });
    this.global.channelThread$.subscribe((messageId) => {
      this.currentChannelThreadId = messageId;
    });
    this.selectedChannel = this.global.currentChannel;
  }

  async sendMessage(event: KeyboardEvent): Promise<void> {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await this.processSendMessage();
      this.formattedMessage = '';
    }
  }

  sendMessageClick(): void {
    if (this.chatMessage.trim() === '' && this.selectFiles.length === 0) {
      console.warn('Keine Nachricht und keine Dateien zum Senden.');
      return;
    }
    if (!this.selectedChannel && !this.selectedUser?.id) {
      console.error('Kein Benutzer oder Kanal ausgewählt.');
      return;
    }
    this.formattedMessage = '';
    this.processSendMessage();
  }

  shouldSendMessage(event: KeyboardEvent): boolean {
    if (event.shiftKey && event.key === 'Enter') {
      return false;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      return true;
    }
    return false;
  }

  async processSendMessage(): Promise<void> {
    if (!this.chatMessage || this.chatMessage.trim().length === 0) {
      console.warn('Leere Nachricht kann nicht gesendet werden.');
      return;
    }
    if (this.selectedChannel && !this.isChannelThreadOpen) {
      await this.sendChannelMessage();
    } else if (this.isDirectThreadOpen) {
      await this.sendDirectThreadMessage();
      await this.setMessageCount();
    } else if (this.isChannelThreadOpen) {
      await this.sendChannelThreadMessage();
    } else {
      try {
        const fileData = await this.uploadFilesToFirebaseStorage();
  
        const messageData = this.messageData(
          this.chatMessage,
          this.senderStickerCount,
          this.recipientStickerCount
        );
        messageData.selectedFiles = fileData;
        const messagesRef = collection(this.firestore, 'messages');
        const docRef = await addDoc(messagesRef, messageData);
        const messageWithId = { ...messageData, id: docRef.id };
        this.messagesData.push(messageWithId);
        await this.setMessageCount();
        this.messageSent.emit();
        this.chatMessage = '';
        this.formattedChatMessage = '';
        this.selectFiles = [];
      } catch (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
      }
    }
  }
  


  async sendChannelThreadMessage() {
    if (!this.currentChannelThreadId || this.chatMessage.trim() === '') {
      console.warn('Thread is not open or message is empty');
      return;
    }
    try {
      const threadRef = collection(
        this.firestore,
        'channels',
        this.selectedChannel.id,
        'messages',
        this.currentChannelThreadId,
        'thread'
      );
      const messageData = {
        text: this.chatMessage,
        senderId: this.global.currentUserData.id,
        senderName: this.global.currentUserData.name,
        senderPicture: this.global.currentUserData.picture || '',
        timestamp: new Date(),
        selectedFiles: this.selectFiles,
      };
      await addDoc(threadRef, messageData);
    } catch (err) {
      console.error(err);
    }
    this.chatMessage = '';
    this.formattedChatMessage = '';
    this.selectFiles = [];
  }

  async sendDirectThreadMessage() {
    if (!this.isDirectThreadOpen || this.chatMessage.trim() === '') {
      console.warn('Thread is not open or message is empty');
      return;
    }
    if (!this.currentThreadMessageId) {
      console.error('No current message selected.');
      return;
    }

    try {
      const threadMessagesRef = collection(
        this.firestore,
        `messages/${this.currentThreadMessageId}/threadMessages`
      );
      const messageData = {
        text: this.chatMessage,
        senderId: this.global.currentUserData.id,
        senderName: this.global.currentUserData.name,
        senderPicture: this.global.currentUserData.picture || '',
        timestamp: new Date(),
        selectedFiles: this.selectFiles,
        editedTextShow: false,
        recipientId: this.selectedUser.uid,
        recipientName: this.selectedUser.name,
        reactions: '',
      };
      const docRef = await addDoc(threadMessagesRef, messageData);
/*       this.threadControlService.setLastMessageId(docRef.id); */
      this.resetInputdata();
      this.messageSent.emit();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  resetInputdata() {
    this.chatMessage = '';
    this.selectFiles = [];
  }

  async setMessageCount() {
    try {
      if (!this.userId || !this.selectedUser?.uid) {
        console.error('User ID or selected user ID is missing.');
        return;
      }
      const messageCountDocRef = doc(
        this.firestore,
        'messageCounts',
        this.selectedUser?.uid
      );
      const userUpdate: any = {};
      userUpdate[`messageCount.${this.userId}`] = increment(1);
      const docSnapshot = await getDoc(messageCountDocRef);
      if (docSnapshot.exists()) {
        await updateDoc(messageCountDocRef, userUpdate);
      } else {
        await setDoc(messageCountDocRef, {
          messageCount: {
            [this.userId]: 1,
          },
        });
      }
    } catch (error) {
      console.error('Error updating message count:', error);
    }
  }

  async uploadFilesToFirebaseStorage(): Promise<
    { url: string; type: string }[]
  > {
    const storage = this.storage;
    const uploadPromises = this.selectFiles.map(async (file, index) => {
      const filePath = `uploads/${new Date().getTime()}_${index}_${
        file.type.split('/')[1]
      }`;
      const fileRef = ref(storage, filePath);
      await uploadString(fileRef, file.data, 'data_url');
      const url = await getDownloadURL(fileRef);
      return { url, type: file.type, data: file.data };
    });
    return await Promise.all(uploadPromises);
  }

  handleNewThreadMessage(threadMessageId: string) {
    this.currentThreadMessageId = threadMessageId;
    this.threadControlService.setCurrentThreadMessageId(threadMessageId);
  }

  async sendChannelMessage() {
    if (!this.selectedChannel || this.chatMessage.trim() === '') {
      console.warn('Channel is not selected or message is empty');
      return;
    }
    const channelMessagesRef = collection(
      this.firestore,
      'channels',
      this.selectedChannel.id,
      'messages'
    );
    const fileData = await this.uploadFilesToFirebaseStorage();
    const messageData = {
      text: this.chatMessage,
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      timestamp: new Date(),
      selectedFiles: this.selectFiles,
      editedTextShow: false,
    };
    messageData.selectedFiles = fileData;
    const docRef = await addDoc(channelMessagesRef, messageData);
    this.chatMessage = '';
    this.selectFiles = [];
    this.messageSent.emit();
    console.log(this.chatMessage);
  }

  messageData(
    chatMessage: string,
    senderStickerCount: number = 0,
    recipientStickerCount: number = 0
  ): SendMessageInfo {
    const recipientId = this.selectedUser?.id;
    const recipientName = this.selectedUser?.name;
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
    };
  }

  getByUserName() {
    const docRef = collection(this.firestore, 'users');
    onSnapshot(docRef, (querySnapshot) => {
      this.mentionUserName = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userName = data['name'];
        this.mentionUserName.push(userName);
      });
    });
  }

  formattedMessage: string = '';


  handleMentionUser(mention: string) {
    this.isMentionPeopleCardVisible = false;
    this.mentionCardOpened.emit(false);
    const mentionTag = `@${mention}`;
    if (!this.chatMessage.includes(mentionTag)) {
      this.chatMessage += `${mentionTag}  `;
      this.updateFormattedMessage();
    }
    
    // Sende das Ereignis mit dem Mention-Wert an das Parent
    this.mentionUserOut.emit(mention);
  }

  handleCardClosed() {
    this.isMentionPeopleCardVisible = false; // Schließt die Karte
  }


  // const regex =/@[\w\-\*_!$]+(?:\s[\w\-\*_!$]+)*/g;

  updateFormattedMessage() {
    const regex = /@[\w\-\*_!$]+(?:\s[\w\-\*_!$]+)*/g;
    this.formattedMessage = this.chatMessage.replace(regex, (match) => {
      const mentionName = match.substring(1).trim().toLowerCase(); // Normalisiere das Tag
      const normalizedUserNames = this.mentionUserName.map((name) => name.trim().toLowerCase());
      console.log('mentionName:', mentionName);
      console.log('mentionUserName:', this.mentionUserName);
      console.log('Normalized mentionUserName:', normalizedUserNames);
  
      if (normalizedUserNames.includes(mentionName)) {
        return `<span class="mention">${match.trim()}</span>`;
      } else {
        return match.trim();
      }
    });
  }
  

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    const container = document.querySelector('.main-input-area') as HTMLElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    const containerh = document.querySelector('.highlight') as HTMLElement;
    if (containerh) {
      containerh.scrollTop = containerh.scrollHeight;
    }
    this.updateFormattedMessage();
  }

  updateSelectedUser(newUser: any) {
    this.selectedUser = newUser;
    this.cdr.detectChanges();
  }

  openMentionPeople() {
    this.isMentionPeopleCardVisible = !this.isMentionPeopleCardVisible;
  }

  toggleEmojiPicker() {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
    if (this.isEmojiPickerVisible) {
      setTimeout(() => {
        this.isEmojiPickerVisible = true;
      }, 0);
    }
  }

  scrollToBottom(): void {
    this.scrollContainer.nativeElement.scrollTop =
      this.scrollContainer.nativeElement.scrollHeight;
  }

  scrollAutoDown(): void {
    setTimeout(() => {
      this.scrollToBottom();
    }, 1000);
  }

  addEmoji(event: any) {
    const emoji = event.emoji.native;
    this.chatMessage += emoji;
    this.formattedMessage += emoji;
    this.isEmojiPickerVisible = false;
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

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.selectFiles.push({
            type: file.type,
            data: reader.result as string,
            preview: reader.result as string,
          });
          console.log(this.selectFiles);
        };
        reader.readAsDataURL(file);
      });
      input.value = '';
    }
  }

  deleteFile(index: number) {
    this.selectFiles.splice(index, 1);
  }
}
