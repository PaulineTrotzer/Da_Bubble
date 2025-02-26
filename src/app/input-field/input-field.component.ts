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
import { InputfieldService } from '../services/inputfield.service';
import { FilesPreviewComponent } from '../files-preview/files-preview.component';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [
    CommonModule,
    PickerComponent,
    PeopleMentionComponent,
    FormsModule,
    FilesPreviewComponent,
  ],
  templateUrl: './input-field.component.html',
  styleUrl: './input-field.component.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }), // Startzustand
        animate(
          '300ms ease-out', // Dauer + Timing
          style({ opacity: 1 })
        ), // Endzustand
      ]),
      transition(':leave', [animate('300ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
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
  authService = inject(AuthService);
  @ViewChild('inputField', { static: true })
  inputFieldRef!: ElementRef<HTMLTextAreaElement>;

  inputFieldService = inject(InputfieldService);
  @Input() activeComponentId!: string;
  @Output() messageCreated = new EventEmitter<any>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedUser'] && this.selectedUser?.id) {
      console.log('selectedUser changed in inputC', this.selectedUser);
      this.resetInputdata();
      this.handleResetErrors();
    }
  }

  @ViewChild('editableDiv') editableDivRef!: ElementRef<HTMLDivElement>;

  ngAfterViewInit() {
    this.editableDivRef.nativeElement.focus();
  }

  ngOnInit(): void {
    this.authService.initAuthListener();
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId && this.selectedUser?.id) {
    }
    this.getByUserName();
    this.subscription.add(
      this.threadControlService.firstThreadMessageId$.subscribe({
        next: (messageId) => {
          console.log('Empfangenes Message ID:', messageId);
          this.currentThreadMessageId = messageId;
        },
        error: (err) => console.error('Fehler im Subscription-Stream:', err),
        complete: () => console.log('Observable wurde beendet.'),
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
    }
  }

  sendMessageClick(): void {
    const selectedFiles = this.inputFieldService.getFiles(
      this.activeComponentId
    );
    console.log('can send?', this.activeComponentId);
    if (
      this.chatMessage.trim() === '' &&
      (!selectedFiles || selectedFiles.length === 0)
    ) {
      console.warn('Keine Nachricht und keine Dateien zum Senden.');
      return;
    }
    if (!this.selectedChannel && !this.selectedUser?.id) {
      console.error('Kein Benutzer oder Kanal ausgewählt.');
      return;
    }

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

  fileTooLargeMessage: string | null = null;
  multipleFilesErrorMessage: string | null = null;
  sendingStatus: string | null = null;

  async processSendMessage(): Promise<void> {
    if (!this.canSendMessage()) {
      return;
    }

    if (this.selectedChannel && !this.isChannelThreadOpen) {
      await this.sendChannelMessage();
    } else if (this.isDirectThreadOpen && this.selectedUser) {
      await this.sendDirectThreadMessage();
      await this.setMessageCount();
    } else if (this.isChannelThreadOpen) {
      await this.sendChannelThreadMessage();
    } else {
      await this.sendStandardMessage();
    }
  }

  canSendMessage(): boolean {
    const selectedFiles = this.inputFieldService.getFiles(
      this.activeComponentId
    );

    const noText = !this.chatMessage || this.chatMessage.trim().length === 0;
    const noFiles = !selectedFiles || selectedFiles.length === 0;

    if (noText && noFiles) {
      this.sendingStatus = null;
      console.warn('Leere Nachricht kann nicht gesendet werden.');
      return false;
    }

    if (selectedFiles.length === 1) {
      this.sendingStatus = 'Message is reaching chat partner...';
      const file = selectedFiles[0];
      const fileBlob = this.dataURLToBlob(file.data);

      const MAX_FILE_SIZE = 500 * 1024; // 500KB
      if (fileBlob.size > MAX_FILE_SIZE) {
        this.fileTooLargeMessage =
          'Bitte konvertiere deine Datei (max. 500 KB):';
        this.multipleFilesErrorMessage = null;
        this.sendingStatus = null;
        return false;
      }
    }

    return true;
  }

  private async sendStandardMessage(): Promise<void> {
    const selectedFiles = this.inputFieldService.getFiles(
      this.activeComponentId
    );

    try {
      const localTempId = `temp_${Date.now()}_${Math.random()}`;
      const localMessage = {
        id: localTempId,
        text: this.chatMessage,
        sending: true,
        timestamp: new Date(),
        selectedFiles: selectedFiles.map((file) => ({
          url: file.data,
          type: file.type,
          name: file.name,
        })),
      };
      this.messageCreated.emit(localMessage);
      const fileData = await this.uploadFilesToFirebaseStorage(selectedFiles);

      const messageData = this.messageData(
        this.chatMessage,
        this.senderStickerCount,
        this.recipientStickerCount
      );

      messageData.selectedFiles = fileData.map((file) => ({
        url: file.url,
        type: file.type,
        name: file.name,
      }));

      const messagesRef = collection(this.firestore, 'messages');
      const docRef = await addDoc(messagesRef, messageData);

      const messageWithId = { ...messageData, id: docRef.id };
      this.messagesData.push(messageWithId);

      await this.setMessageCount();
      this.messageSent.emit();
      this.resetInputdata();
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      if (this.editableDivRef?.nativeElement) {
        this.editableDivRef.nativeElement.style.height = '130px';
      }
      this.inputFieldService.updateFiles(this.activeComponentId, []);
      this.sendingStatus = null;
      this.handleResetErrors();
    }
  }

  dataURLToBlob(dataURL: string): Blob {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
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
    this.resetInputdata();
  }

  async sendDirectThreadMessage() {
    if (
      !this.isDirectThreadOpen ||
      (this.chatMessage.trim() === '' &&
        this.inputFieldService.getFiles(this.activeComponentId).length === 0)
    ) {
      console.warn(
        'Thread ist nicht offen oder die Nachricht ist leer und es sind keine Dateien ausgewählt'
      );
      return;
    }

    if (!this.currentThreadMessageId) {
      console.error('Keine Thread-ID (currentThreadMessageId) vorhanden.');
      return;
    }

    console.log('selectedUser:', this.selectedUser);
    if (!this.selectedUser) {
      console.error('Kein Empfänger (this.selectedUser) ist definiert.');
      return;
    }
    if (!this.selectedUser.name) {
      console.error('Es fehlt der Name des Empfängers!');
      return;
    }

    console.log('selectedUser.uid:', this.selectedUser.id);
    if (!this.selectedUser.id) {
      console.error('Keine UID bei selectedUser vorhanden.');
      return;
    }

    try {
      const selectedFiles = this.inputFieldService.getFiles(
        this.activeComponentId
      );
      let uploadedFiles: any[] = [];
      if (selectedFiles.length > 0) {
        console.log('Selected Files:', selectedFiles);
        uploadedFiles = await this.uploadFilesToFirebaseStorage(selectedFiles);
      }

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
        selectedFiles: uploadedFiles.map((file) => ({
          url: file.url,
          type: file.type,
        })),
        editedTextShow: false,
        recipientId: this.selectedUser.id,
        recipientName: this.selectedUser.name ?? '',
        reactions: '',
      };
      console.log('messageData:', messageData);
      await addDoc(threadMessagesRef, messageData);
      console.log('Message successfully sent to Firestore!');
      this.resetInputdata();
      this.messageSent.emit();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      if (this.editableDivRef?.nativeElement) {
        this.editableDivRef.nativeElement.style.height = '130px';
      }
      this.inputFieldService.updateFiles(this.activeComponentId, []);
      this.sendingStatus = null;
      this.handleResetErrors();
    }
  }

  resetInputdata() {
    this.chatMessage = '';
    this.selectFiles = [];
    this.formattedChatMessage = '';
    if (this.editableDivRef?.nativeElement) {
      this.editableDivRef.nativeElement.innerHTML = '';
      this.editableDivRef.nativeElement.focus();
    }
  }

  async setMessageCount() {
    try {
      if (!this.userId || !this.selectedUser?.id) {
        console.error('User ID or selected user ID is missing.');
        return;
      }
      const messageCountDocRef = doc(
        this.firestore,
        'messageCounts',
        this.selectedUser?.id
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

  async uploadFilesToFirebaseStorage(
    files: { data: string; type: string; name: string }[]
  ): Promise<
    {
      name: any;
      url: string;
      type: string;
    }[]
  > {
    const storage = this.storage;

    const uploadPromises = files.map(async (file, index) => {
      const filePath = `uploads/${new Date().getTime()}_${index}_${
        file.type.split('/')[1]
      }`;
      const fileRef = ref(storage, filePath);
      await uploadString(fileRef, file.data, 'data_url');
      const url = await getDownloadURL(fileRef);
      return {
        url,
        type: file.type,
        name: file.name,
      };
    });

    return await Promise.all(uploadPromises);
  }

  handleNewThreadMessage(threadMessageId: string) {
    this.currentThreadMessageId = threadMessageId;
    this.threadControlService.setCurrentThreadMessageId(threadMessageId);
  }

  async sendChannelMessage(): Promise<void> {
    if (!this.selectedChannel) {
      console.warn('Channel is not selected');
      return;
    }
    const selectedFiles = this.inputFieldService.getFiles(
      this.activeComponentId
    );

    try {
      const localTempId = `temp_${Date.now()}_${Math.random()}`;
      const localMessage = {
        id: localTempId,
        text: this.chatMessage,
        sending: true,
        timestamp: new Date(),
        selectedFiles: selectedFiles.map((file) => ({
          url: file.data,
          type: file.type,
          name: file.name,
        })),
      };
      this.messageCreated.emit(localMessage);
      const fileData = await this.uploadFilesToFirebaseStorage(selectedFiles);

      const messageData = {
        text: this.chatMessage,
        senderId: this.global.currentUserData.id,
        senderName: this.global.currentUserData.name,
        senderPicture: this.global.currentUserData.picture || '',
        timestamp: new Date(),
        editedTextShow: false,
        selectedFiles: fileData.map((file) => ({
          url: file.url,
          type: file.type,
          name: file.name,
        })),
      };

      const channelMessagesRef = collection(
        this.firestore,
        'channels',
        this.selectedChannel.id,
        'messages'
      );
      const docRef = await addDoc(channelMessagesRef, messageData);
      const messageWithId = { ...messageData, id: docRef.id };
      this.messagesData.push(messageWithId);

      this.messageSent.emit();
      this.resetInputdata();
    } catch (error) {
      console.error('Fehler beim Senden der Channel-Nachricht:', error);
    } finally {
      if (this.editableDivRef?.nativeElement) {
        this.editableDivRef.nativeElement.style.height = '130px';
      }
      this.inputFieldService.updateFiles(this.activeComponentId, []);
      this.sendingStatus = null;
      this.handleResetErrors();
    }
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
    const usersCollection = collection(this.firestore, 'users');
    onSnapshot(usersCollection, (querySnapshot) => {
      this.mentionUserName = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Statt data['name'] -> data['username']:
        const userName = data['username'];
        // Optional: Normalisiert abspeichern:
        if (userName) {
          this.mentionUserName.push(userName.toLowerCase().trim());
        }
      });
    });
  }

  formattedMessage: string = '';

  handleMentionUser(mention: string) {
    this.isMentionPeopleCardVisible = false;
    this.mentionCardOpened.emit(false);
    const mentionTag = `@${mention}`;
    if (!this.chatMessage.includes(mentionTag)) {
      this.chatMessage += `${mentionTag} `;
      this.updateFormattedMessage();

      const textarea = document.getElementById(
        'msg-input'
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        const position = this.chatMessage.length;
        textarea.setSelectionRange(position, position);
      }
    }
    this.mentionUserOut.emit(mention);
  }

  handleCardClosed() {
    this.isMentionPeopleCardVisible = false;
  }

  updateFormattedMessage() {
    const regex = /@([\w\-\*_!$]+(?:\s+[\w\-\*_!$]+)*)/g

    console.log('mentionUserName ARRAY:', this.mentionUserName); // Debug

    this.formattedMessage = this.chatMessage.replace(regex, (match) => {
      const mentionName = match.substring(1).toLowerCase().trim();
      console.log('mentionName GETIPPT:', mentionName); // Debug

      const normalizedUserNames = this.mentionUserName.map((name) =>
        name.toLowerCase().trim()
      );
      console.log('normalizedUserNames:', normalizedUserNames);

      if (normalizedUserNames.includes(mentionName)) {
        return `<span class="mention">${match}</span>`;
      } else {
        return match;
      }
    });
  }

  onInput(event: Event): void {
    const editableDiv = event.target as HTMLDivElement;
    this.chatMessage = editableDiv.innerText;
  }

  handleResetErrors() {
    this.fileTooLargeMessage = null;
    this.multipleFilesErrorMessage = null;
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

  addEmoji(event: any) {
    const emoji = event.emoji.native;
    this.chatMessage += emoji;
    this.updateFormattedMessage();
    const editableDiv = this.editableDivRef?.nativeElement;
    if (editableDiv) {
      editableDiv.innerHTML = this.formattedMessage;
    }
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

  onFileSelected(event: Event, componentId: string): void {
    if (componentId !== 'chat') {
      console.error(
        'onFileSelected called with wrong componentId in Chat:',
        componentId
      );
      return;
    }
    this.inputFieldService.setActiveComponent(componentId);

    const input = event.target as HTMLInputElement;

    const existingFiles = this.inputFieldService.getFiles(componentId);
    if (existingFiles.length > 0) {
      console.error('Es kann nur eine Datei hochgeladen werden.');
      this.multipleFilesErrorMessage =
        'Es kann nur eine Datei hochgeladen werden.';
      this.fileTooLargeMessage = null;
      return;
    }

    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      const allowedTypes = ['image/', 'application/pdf'];

      if (!allowedTypes.some((type) => selectedFile.type.startsWith(type))) {
        console.error('Unsupported file type:', selectedFile.type);
        this.fileTooLargeMessage =
          'Nur Bilder und PDFs können hochgeladen werden.';
        this.multipleFilesErrorMessage = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          data: reader.result as string,
        };

        this.inputFieldService.updateFiles(componentId, [fileData]);
        const chatDiv = this.editableDivRef.nativeElement;
        if (chatDiv) {
          chatDiv.style.height = '250px';
        }
      };
      reader.readAsDataURL(selectedFile);

      input.value = '';
    }
  }

  onFileSelectedChannel(event: Event, componentId: string): void {
    if (componentId !== 'channel') {
      console.error(
        'onFileSelectedThread called with wrong componentId: in channel',
        componentId
      );
      return;
    }
    this.inputFieldService.setActiveComponent(componentId);
    const input = event.target as HTMLInputElement;

    const existingFiles = this.inputFieldService.getFiles(componentId);
    if (existingFiles.length > 0) {
      console.error('Es kann nur eine Datei pro Nachricht hochgeladen werden.');
      this.multipleFilesErrorMessage =
        'Es kann nur eine Datei pro Nachricht hochgeladen werden.';
      this.fileTooLargeMessage = null;
      return;
    }

    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      const allowedTypes = ['image/', 'application/pdf'];
      if (!allowedTypes.some((type) => selectedFile.type.startsWith(type))) {
        console.error('Unsupported file type:', selectedFile.type);
        this.fileTooLargeMessage =
          'Nur Bilder und PDFs können hochgeladen werden.';
        this.multipleFilesErrorMessage = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          data: reader.result as string,
        };

        this.inputFieldService.updateFiles(componentId, [fileData]);
        const chatDiv = this.editableDivRef.nativeElement;
        if (chatDiv) {
          chatDiv.style.height = '250px';
        }
        console.log('File added in channel:', fileData);
      };

      reader.readAsDataURL(selectedFile);
      input.value = '';
    }
  }

  onFileSelectedChannelThread(event: Event, componentId: string): void {
    console.log('wurde aufgerufen');
    if (componentId !== 'channel-thread') {
      console.error(
        'onFileSelectedThread called with wrong componentId: in channel',
        componentId
      );
      return;
    }
    this.inputFieldService.setActiveComponent(componentId);
    const input = event.target as HTMLInputElement;

    const existingFiles = this.inputFieldService.getFiles(componentId);
    if (existingFiles.length > 0) {
      console.error('Es kann nur eine Datei pro Nachricht hochgeladen werden.');
      this.multipleFilesErrorMessage =
        'Es kann nur eine Datei pro Nachricht hochgeladen werden.';
      this.fileTooLargeMessage = null;
      return;
    }

    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      const allowedTypes = ['image/', 'application/pdf'];
      if (!allowedTypes.some((type) => selectedFile.type.startsWith(type))) {
        console.error('Unsupported file type:', selectedFile.type);
        this.fileTooLargeMessage =
          'Nur Bilder und PDFs können hochgeladen werden.';
        this.multipleFilesErrorMessage = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          data: reader.result as string,
        };

        this.inputFieldService.updateFiles(componentId, [fileData]);
        const chatDiv = this.editableDivRef.nativeElement;
        if (chatDiv) {
          chatDiv.style.height = '250px';
        }
        console.log('File added in channel:', fileData);
      };

      reader.readAsDataURL(selectedFile);
      input.value = '';
    }
  }

  handlePreviewUpdated(hasFiles: boolean) {
    if (!hasFiles) {
      const chatDiv = this.editableDivRef.nativeElement;
      if (chatDiv) {
        chatDiv.style.height = '130px';
      }
    }
  }

  onFileSelectedThread(event: Event, componentId: string): void {
    if (componentId !== 'direct-thread') {
      console.error(
        'onFileSelectedThread called with wrong componentId: in Thread',
        componentId
      );
      return;
    }
    this.inputFieldService.setActiveComponent(componentId);
    const input = event.target as HTMLInputElement;
    const existingFiles = this.inputFieldService.getFiles(componentId);
    if (existingFiles.length > 0) {
      console.error('Es kann nur eine Datei pro Nachricht hochgeladen werden.');
      this.multipleFilesErrorMessage =
        'Es kann nur eine Datei pro Nachricht hochgeladen werden.';
      this.fileTooLargeMessage = null;
      return;
    }

    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      const allowedTypes = ['image/', 'application/pdf'];

      if (!allowedTypes.some((type) => selectedFile.type.startsWith(type))) {
        console.error('Unsupported file type:', selectedFile.type);
        this.fileTooLargeMessage =
          'Nur Bilder und PDFs können hochgeladen werden.';
        this.multipleFilesErrorMessage = null;
        return;
      }

      // Datei laden
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          data: reader.result as string,
        };

        this.inputFieldService.updateFiles(componentId, [fileData]);
        const chatDiv = this.editableDivRef.nativeElement;
        if (chatDiv) {
          chatDiv.style.height = '250px';
        }
        console.log('File added in thread:', fileData);
      };

      reader.readAsDataURL(selectedFile);
      input.value = '';
    }
  }

  @Input() currentComponentId!: string;
  @Output() inputFieldFocused = new EventEmitter<string>();
}
