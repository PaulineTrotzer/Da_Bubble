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
  authService = inject(AuthService);
  @ViewChild('inputField', { static: true })
  inputFieldRef!: ElementRef<HTMLTextAreaElement>;
  
  inputFieldService = inject(InputfieldService);
  activeComponentId!: string;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedUser'] && this.selectedUser?.id) {
    }
  }
  focusInputField(): void {
  /*   const mainInputArea = document.querySelector('.main-input-area') as HTMLDivElement;
    if (mainInputArea) {
      mainInputArea.focus();
    } */
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

    this.inputFieldService.activeComponentId$.subscribe((id) => {
      this.activeComponentId = id;
      this.cdr.detectChanges();
    });
  }

  async sendMessage(event: KeyboardEvent): Promise<void> {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await this.processSendMessage();
      this.formattedMessage = '';
    }
  }
  sendMessageClick(): void {
    const selectedFiles = this.inputFieldService.getFiles('chat');
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

    this.formattedMessage = '';
    /*     this.processSendMessage().then(() => {
      this.isPreviewActive = false;
    }); */
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

  async processSendMessage(): Promise<void> {
    const selectedFiles = this.inputFieldService.getFiles(
      this.currentComponentId
    );

    // Prüfen, ob keine Nachricht oder Datei ausgewählt ist
    if (
      (!this.chatMessage || this.chatMessage.trim().length === 0) &&
      selectedFiles.length === 0
    ) {
      console.warn('Leere Nachricht kann nicht gesendet werden.');
      return;
    }

    // Maximal zulässige Dateigröße in Bytes (500 KB)
    const MAX_FILE_SIZE = 500 * 1024; // 500 KB

    // Prüfen, ob die hochgeladene Datei zu groß ist
    if (selectedFiles.length === 1) {
      const file = selectedFiles[0];
      const fileBlob = this.dataURLToBlob(file.data);

      if (fileBlob.size > MAX_FILE_SIZE) {
        this.fileTooLargeMessage = `Bitte konvertiere deine Datei (max. 500 KB):`;
        this.multipleFilesErrorMessage = null; // Sicherstellen, dass keine vorherige Fehlermeldung angezeigt wird
        return;
      }
    }

    // Restliche Logik bleibt unverändert
    if (this.selectedChannel && !this.isChannelThreadOpen) {
      await this.sendChannelMessage();
    } else if (this.isDirectThreadOpen) {
      await this.sendDirectThreadMessage();
      await this.setMessageCount();
    } else if (this.isChannelThreadOpen) {
      await this.sendChannelThreadMessage();
    } else {
      try {
        // Dateien zu Firebase hochladen
        const fileData = await this.uploadFilesToFirebaseStorage(selectedFiles);

        // Nachrichtendaten vorbereiten
        const messageData = this.messageData(
          this.chatMessage,
          this.senderStickerCount,
          this.recipientStickerCount
        );

        // URLs und Typen der hochgeladenen Dateien hinzufügen
        messageData.selectedFiles = fileData.map((file) => ({
          url: file.url,
          type: file.type,
          name: file.name,
        }));

        // Nachricht in Firestore speichern
        const messagesRef = collection(this.firestore, 'messages');
        const docRef = await addDoc(messagesRef, messageData);

        // Nachricht in die lokale Liste einfügen
        const messageWithId = { ...messageData, id: docRef.id };
        this.messagesData.push(messageWithId);

        // Nach dem Senden Input-Feld und andere Zustände zurücksetzen
        await this.setMessageCount();
        this.messageSent.emit();
        this.chatMessage = '';
        this.formattedChatMessage = '';
        this.inputFieldService.updateFiles(this.currentComponentId, []);
        const textarea = document.getElementById(
          'msg-input'
        ) as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = '130px'; // Höhe auf Standardgröße setzen
        }
      } catch (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
      }
    }
  }

  /*   onPreviewUpdated(isActive: boolean): void {
    this.isPreviewActive = isActive;
    console.log('Preview status:', isActive);
  } */

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
    this.chatMessage = '';
    this.formattedChatMessage = '';
    this.selectFiles = [];
  }

  async sendDirectThreadMessage() {
    if (
      !this.isDirectThreadOpen ||
      (this.chatMessage.trim() === '' &&
        this.inputFieldService.getFiles(this.currentComponentId).length === 0)
    ) {
      console.warn(
        'Thread is not open or message is empty and no files are selected'
      );
      return;
    }
    if (!this.currentThreadMessageId) {
      console.error('No current message selected.');
      return;
    }
    try {
      const selectedFiles = this.inputFieldService.getFiles(
        this.currentComponentId
      );
      let uploadedFiles: any[] = [];
      if (selectedFiles.length > 0) {
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
        recipientId: this.selectedUser.uid,
        recipientName: this.selectedUser.name,
        reactions: '',
      };
      const docRef = await addDoc(threadMessagesRef, messageData);
      this.resetInputdata();
      this.messageSent.emit();
      this.inputFieldService.updateFiles(this.currentComponentId, []);
      this.cdr.detectChanges();
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

      // Datei als Base64 (data_url) hochladen
      await uploadString(fileRef, file.data, 'data_url');

      // URL der hochgeladenen Datei abrufen
      const url = await getDownloadURL(fileRef);
      return {
        url,
        type: file.type,
        name: file.name, // Hier den Namen hinzufügen
      };
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
    /*     const fileData = await this.uploadFilesToFirebaseStorage(); */

    const messageData = {
      text: this.chatMessage,
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      timestamp: new Date(),
      /*       selectedFiles: fileData, */
      editedTextShow: false,
    };
    await addDoc(channelMessagesRef, messageData);
    this.chatMessage = '';
    this.selectFiles = [];
    this.messageSent.emit();
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
    this.isMentionPeopleCardVisible = false; // Schließt die Karte
  }

  // const regex =/@[\w\-\*_!$]+(?:\s[\w\-\*_!$]+)*/g;

  updateFormattedMessage() {
    const regex = /(@[\w\-\*_!$]+)(?=\s|$)/g;
    this.formattedMessage = this.chatMessage.replace(regex, (match) => {
      const mentionName = match.substring(1).trim().toLowerCase();
      const normalizedUserNames = this.mentionUserName.map((name) =>
        name.trim().toLowerCase()
      );

      if (normalizedUserNames.includes(mentionName)) {
        return `<span class="mention">${match.trim()}</span>`;
      } else {
        return match.trim();
      }
    });
    this.formattedMessage = this.formattedMessage.replace(/\s\s+/g, ' ');
  }

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    // Scrollen der Container synchronisieren
    const container = document.querySelector('.main-input-area') as HTMLElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }

    const containerh = document.querySelector('.highlight') as HTMLElement;
    if (containerh) {
      containerh.scrollTop = containerh.scrollHeight;
    }

    this.updateFormattedMessage(); // Aktualisiere das Highlighting
  }

  handleResetErrors(): void {
    const textarea = this.inputFieldRef?.nativeElement;
    if (textarea) {
      textarea.style.height = '130px'; // Höhe auf Standardgröße setzen
    }
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

  onFileSelected(event: Event, componentId: string): void {
    if (componentId !== 'chat') {
      console.error(
        'onFileSelected called with wrong componentId in Chat:',
        componentId
      );
      return;
    }
    /*     this.isPreviewActive = true;  */
    this.inputFieldService.setActiveComponent(componentId);

    const input = event.target as HTMLInputElement;

    // Überprüfen, ob bereits eine Datei existiert
    const existingFiles = this.inputFieldService.getFiles(componentId);
    if (existingFiles.length > 0) {
      console.error('Es kann nur eine Datei hochgeladen werden.');
      this.multipleFilesErrorMessage =
        'Es kann nur eine Datei hochgeladen werden.';
      this.fileTooLargeMessage = null; // Andere Fehlermeldung zurücksetzen
      return;
    }

    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0]; // Nur die erste Datei auswählen
      const allowedTypes = ['image/', 'application/pdf'];

      // Prüfung: Unterstützte Dateitypen
      if (!allowedTypes.some((type) => selectedFile.type.startsWith(type))) {
        console.error('Unsupported file type:', selectedFile.type);
        this.fileTooLargeMessage =
          'Nur Bilder und PDFs können hochgeladen werden.';
        this.multipleFilesErrorMessage = null; // Andere Fehlermeldung zurücksetzen
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

        // Datei speichern
        this.inputFieldService.updateFiles(componentId, [fileData]);
        const textarea = document.getElementById(
          'msg-input'
        ) as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = '250px'; // Höhe auf Vorschau-Größe setzen
        }
      };
      reader.readAsDataURL(selectedFile);

      input.value = ''; // Input-Feld zurücksetzen
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

    this.inputFieldService.setActiveComponent('direct-thread');
    const input = event.target as HTMLInputElement;

    // Überprüfen, ob bereits eine Datei existiert
    const existingFiles = this.inputFieldService.getFiles(componentId);
    if (existingFiles.length > 0) {
      console.error('Es kann nur eine Datei pro Nachricht hochgeladen werden.');
      this.multipleFilesErrorMessage =
        'Es kann nur eine Datei pro Nachricht hochgeladen werden.';
      this.fileTooLargeMessage = null; // Sicherstellen, dass andere Fehlermeldungen zurückgesetzt werden
      return;
    }

    // Überprüfen, ob eine Datei ausgewählt wurde
    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      const allowedTypes = ['image/', 'application/pdf'];

      // Prüfung: Unterstützte Dateitypen
      if (!allowedTypes.some((type) => selectedFile.type.startsWith(type))) {
        console.error('Unsupported file type:', selectedFile.type);
        this.fileTooLargeMessage =
          'Nur Bilder und PDFs können hochgeladen werden.';
        this.multipleFilesErrorMessage = null; // Sicherstellen, dass andere Fehlermeldungen zurückgesetzt werden
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

        // Datei speichern
        this.inputFieldService.updateFiles(componentId, [fileData]);
        this.cdr.detectChanges();
        console.log('File added in thread:', fileData);
      };

      reader.readAsDataURL(selectedFile);
      input.value = ''; // Input-Feld zurücksetzen
      /*       this.isPreviewActive = true; // Vorschau aktivieren */
    }
  }

  @Input() currentComponentId!: string;
  @Output() inputFieldFocused = new EventEmitter<string>();

  /*   onFocus() {
    console.log('Focusing component with ID:', this.currentComponentId);
    if (!this.currentComponentId) {
      console.error('currentComponentId is undefined or empty!');
      return;
    }
    this.inputFieldService.setActiveComponent(this.currentComponentId);
  } */

  /*   deleteFile(index: number) {
    this.selectFiles.splice(index, 1);
    this.isPreviewActive = this.selectFiles.length > 0;
    this.cdr.detectChanges();
    console.log('isPreviewActive:', this.isPreviewActive, 'selectFiles:', this.selectFiles);
  } */
}
