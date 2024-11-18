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
  Renderer2

} from '@angular/core';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { GlobalVariableService } from '../services/global-variable.service';
import { PeopleMentionComponent } from '../people-mention/people-mention.component';
import { FormsModule } from '@angular/forms';
import { Firestore, addDoc, collection, doc } from '@angular/fire/firestore';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, PickerComponent, PeopleMentionComponent, FormsModule],
  templateUrl: './input-field.component.html',
  styleUrl: './input-field.component.scss',
})
export class InputFieldComponent implements OnInit {
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



  constructor(private renderer: Renderer2) { }

  ngOnChanges() { }

  ngOnInit(): void {
    this.userService.selectedUser$.subscribe((user) => {
      this.selectedUser = user;
    });
  }

  async sendMessage() {
    if (!this.selectedChannel && !this.selectedUser) {
      console.error('Selected user or channel is not defined');
      return;
    }
  
    if (this.chatMessage.trim() === '') {
      console.warn('Cannot send an empty message.');
      return;
    }
  
    try {
      if (this.selectedChannel) {
        await this.sendChannelMessage();
      } else {
        const messageData = this.messageData(
          this.chatMessage,
          this.senderStickerCount,
          this.recipientStickerCount
        );
  
        const messagesRef = collection(this.firestore, 'messages');
        const docRef = await addDoc(messagesRef, messageData);
        const messageWithId = { ...messageData, id: docRef.id };
  
        console.log('Message successfully sent with ID:', messageWithId);
  
        this.messagesData.push(messageWithId);
        this.messageSent.emit();
      }
  
      this.chatMessage = '';
      this.formattedChatMessage = '';
    } catch (error) {
      console.error('Error while sending message:', error);
    }
  }
  

  async sendChannelMessage(){

    if (!this.selectedChannel || this.chatMessage.trim() === '') {
      console.warn('Channel is not selected or message is empty');
      return;
    }

    const channelMessagesRef = collection(this.firestore, 'channels', this.selectedChannel.id, 'messages');

    const messageData = {
      text: this.chatMessage,
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      timestamp: new Date(),
      selectedFiles: this.selectFiles,
      editedTextShow: false
    };

    const docRef = await addDoc(channelMessagesRef, messageData);

    this.chatMessage = '';
    this.selectFiles = [];
    this.messageSent.emit();
    console.log(this.chatMessage)
  }

  messageData(
    chatMessage: string,
    senderStickerCount: number = 0,
    recipientStickerCount: number = 0
  ): SendMessageInfo {
    const recipientId = this.selectedUser.id;
    const recipientName = this.selectedUser.name;
    return {
      text: chatMessage,
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      recipientId,
      recipientName,
      timestamp: new Date(),
      senderSticker: '',
      senderStickerCount,
      recipientSticker: '',
      recipientStickerCount,
      senderchoosedStickereBackColor: '',
      recipientChoosedStickerBackColor: '',
      stickerBoxCurrentStyle: null,
      stickerBoxOpacity: null,
      selectedFiles: [],
      editedTextShow: false
    };
  }


  formattedChatMessage: any = ''
  color:string='red'


  handleMentionUser(mention: string) {
    this.chatMessage += `@${mention + ' '} `;
    this.formatMentions();
  }

  formatMentions() { 
    const regex = /@([\w\s]+)/g;
    this.formattedChatMessage = this.chatMessage.replace(
      /@(\w+)/g,
      `<span   class="mention"   contenteditable="false" >@$1</span>`
    );
  }

  handleMentionClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('mention')) {
      alert(`Mention clicked: ${target.innerText}`);
    }
  }


  updateSelectedUser(newUser: any) {
    this.selectedUser = newUser;
    this.cdr.detectChanges();
  }

  openMentionPeople() {
    this.global.openMentionPeopleCard = !this.global.openMentionPeopleCard;
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

  getConversationId(): string {
    const ids = [this.global.currentUserData?.id, this.selectedUser?.id];
    ids.sort();
    return ids.join('_');
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
          });
          console.log(this.selectFiles);
        };
        reader.readAsDataURL(file);
      });
      input.value = '';
    }
  }
}
