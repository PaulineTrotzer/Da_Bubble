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
  HostListener
  
  
} from '@angular/core';
import { PeopleMentionComponent } from '../people-mention/people-mention.component';
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
} from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { InputFieldComponent } from '../input-field/input-field.component';
import { Subscription } from 'rxjs';
import { ThreadComponent } from "../thread/thread.component";
import { ChannelChatComponent } from '../channel-chat/channel-chat.component';
import { MentionMessageBoxComponent } from "../mention-message-box/mention-message-box.component";
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

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
    PickerComponent
],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})

export class ChatComponent implements OnInit, OnChanges {
  afterLoginSheet = false;
  welcomeChannelSubscription: Subscription | undefined;
  shouldScroll = true;
  global = inject(GlobalVariableService);
  chatMessage: string = '';
  selectFiles: any[] = [];
  @Input() selectedUser: any;
  @Input() selectedChannel: any;
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
  hoveredCurrentUser: any;
  hoveredRecipienUser: any;
  editMessageId: string | null = null;
  checkUpdateBackcolor: any;
  editableMessageText: string = '';
  showWelcomeChatText = false;
  showTwoPersonConversationTxt = false;
  @ViewChild('scrollContainer') private scrollContainer: any = ElementRef;
  @Output() threadOpened = new EventEmitter<void>();
  checkEditbox:boolean=false
  @ViewChild('editableTextarea') editableTextarea!: ElementRef<HTMLTextAreaElement>;
  commentStricker: string[] = [
    '../../assets/img/comment/face.png',
    '../../assets/img/comment/rocket.png',
  ];
  commentImages: string[] = [
    '../../assets/img/comment/hand.png',
    '../../assets/img/comment/celebration.png',
  ];
  isFirstClick: boolean = true;

  constructor() { }

  ngOnInit(): void {
    
    this.getAllUsersname()
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
    if (this.isFirstClick) {
      setTimeout(() => {
        if (this.editableTextarea) {
          const textarea = this.editableTextarea.nativeElement;
          textarea.scrollTop = textarea.scrollHeight;
          textarea.focus(); 
        }
      },20);
      this.isFirstClick = false; 
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

  cancelEdit() {
    this.editMessageId = null;
    this.editableMessageText = '';
    this.checkEditbox=false;
    this.isFirstClick=true;
    console.log(this.isFirstClick)
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedUser'] && this.selectedUser?.id) {
      this.getMessages();
      this.chatMessage = '';
      this.global.clearCurrentChannel();
      this.getMessages().then(() => this.checkForSelfChat());
    }
    if (changes['selectedChannel'] && !changes['selectedChannel'].firstChange) {
      this.showWelcomeChatText = false;
      this.showTwoPersonConversationTxt = false;
      this.clearInput();
    }
  }

  checkForSelfChat() {
    if (
      this.selectedUser.id === this.global.currentUserData.id &&
      this.messagesData.length === 0
    ) {
      this.showWelcomeChatText = true;
      this.showTwoPersonConversationTxt = false;
    } else {
      this.showWelcomeChatText = false;
      this.checkTwoPersonConversation();
    }
  }

  checkTwoPersonConversation() {
    if (
      this.selectedUser.id !== this.global.currentUserData.id &&
      this.messagesData.length === 0
    ) {
      this.showTwoPersonConversationTxt = true;
    } else {
      this.showTwoPersonConversationTxt = false;
    }
  }

  showBeginningText() {
    this.showWelcomeChatText = true;
  }

  clearInput() {
    this.messagesData = [];
  }


  saveOrDeleteMessage(message: any) {
    const messageRef = doc(this.firestore, 'messages', message.id);
    if (this.editableMessageText.trim() === '') {
      deleteDoc(messageRef).then(() => {
        this.editMessageId = null;
      });
      this.isFirstClick=true;
      this.checkEditbox=false
    } else {
      const editMessage = { text: this.editableMessageText, editedTextShow: true };
      updateDoc(messageRef, editMessage).then(() => {
        this.editMessageId = null;
      }); 
      this.checkEditbox=false;
      this.isFirstClick=true;
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
    this.scrollContainer.nativeElement.scrollTop =
      this.scrollContainer.nativeElement.scrollHeight;
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
    senderStickerCount: number,
    recipientStickerCount: number
  ): SendMessageInfo {
    let recipientId = this.selectedUser.id;
    let recipientName = this.selectedUser.name;
    return {
      text: this.chatMessage,
      senderId: this.global.currentUserData.id,
      senderName: this.global.currentUserData.name,
      senderPicture: this.global.currentUserData.picture || '',
      recipientId,
      recipientName,
      timestamp: new Date(),
      senderSticker: '',
      senderStickerCount: senderStickerCount || 1,
      recipientSticker: '',
      recipientStickerCount: recipientStickerCount || 1,
      senderchoosedStickereBackColor: '',
      recipientChoosedStickerBackColor: '',
      stickerBoxCurrentStyle: null,
      stickerBoxOpacity: null,
      selectedFiles: [],

    };
  }

  // async chooseStricker(event: Event, message: any, selectedSticker: string) {
  //   this.shouldScroll = false;
  //   if (this.global.currentUserData?.id === message.senderId) {
  //     message.senderchoosedStickereBackColor = selectedSticker;
  //     message.stickerBoxCurrentStyle = true;
  //     if (message.senderSticker === selectedSticker) {
  //       message.senderSticker = '';
  //       if (message.senderStickerCount === 2) {
  //         message.senderStickerCount = 1;
  //       }
  //     } else {
  //       message.senderSticker = selectedSticker;
  //       message.senderStickerCount = 1;
  //     }
  //     if (message.recipientSticker === selectedSticker) {
  //       message.recipientStickerCount =
  //         (message.recipientStickerCount || 1) + 1;
  //       message.senderSticker = '';
  //       if (message.recipientStickerCount === 2) {
  //         message.senderSticker = message.recipientSticker;
  //       }
  //       if (message.recipientStickerCount >= 3) {
  //         message.recipientStickerCount = 1;
  //       }
  //     }
  //     if (message.senderSticker !== message.recipientSticker) {
  //       message.recipientStickerCount = 1;
  //     }

  //     if (message.senderSticker === message.recipientSticker) {
  //       message.senderStickerCount = (message.senderStickerCount || 1) + 1;
  //     }
  //   } else if (this.global.currentUserData?.id !== message.senderId) {
  //     message.recipientChoosedStickerBackColor = selectedSticker;
  //     message.stickerBoxCurrentStyle = true;
  //     if (message.recipientSticker === selectedSticker) {
  //       message.recipientSticker = '';
  //       if (message.recipientStickerCount === 2) {
  //         message.recipientStickerCount = 1;
  //       }
  //     } else {
  //       message.recipientSticker = selectedSticker;
  //       message.recipientStickerCount = 1;
  //     }
  //     if (message.senderSticker === selectedSticker) {
  //       message.senderStickerCount = (message.senderStickerCount || 1) + 1;
  //       if (message.senderStickerCount >= 3) {
  //         message.senderStickerCount = 1;
  //       }
  //     }
  //     if (message.recipientSticker !== '' && message.senderStickerCount === 2) {
  //       message.senderStickerCount = 1;
  //       message.recipientSticker = selectedSticker;
  //     }
  //     if (message.recipientSticker === message.senderSticker) {
  //       message.senderStickerCount = (message.senderStickerCount || 1) + 1;
  //     }
  //   }


  //   const messageData = this.messageData(
  //     message.senderStickerCount,
  //     message.recipientStickerCount
  //   );

  //   const strickerRef = doc(this.firestore, 'messages', message.id);
  //   const stikerObj = {
  //     senderSticker: message.senderSticker,
  //     senderStickerCount: message.senderStickerCount,
  //     recipientSticker: message.recipientSticker,
  //     recipientStickerCount: message.recipientStickerCount,
  //     senderchoosedStickereBackColor: message.senderchoosedStickereBackColor,
  //     recipientChoosedStickerBackColor:
  //     message.recipientChoosedStickerBackColor,
  //     stickerBoxCurrentStyle: message.stickerBoxCurrentStyle,
  //     stickerBoxOpacity: message.stickerBoxOpacity,
  //   };
  //   setTimeout(() => {
  //     this.shouldScroll = true;
  //   }, 100);
  //   await updateDoc(strickerRef, stikerObj);
  // }

  getConversationId(): string {
    const ids = [this.global.currentUserData?.id, this.selectedUser?.id];
    ids.sort();
    return ids.join('_');
  }

  async getMessages() {
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

    onSnapshot(q, (querySnapshot) => {
      this.messagesData = [];
      querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        if (messageData['timestamp'] && messageData['timestamp'].toDate) {
          messageData['timestamp'] = messageData['timestamp'].toDate();
        }
        if (
          (messageData['senderId'] === this.global.currentUserData.id &&
            messageData['recipientId'] === this.selectedUser.id) ||
          (messageData['senderId'] === this.selectedUser.id &&
            messageData['recipientId'] === this.global.currentUserData.id) ||
          (this.global.statusCheck &&
            messageData['senderId'] === this.global.currentUserData.id &&
            messageData['recipientId'] === this.global.currentUserData.id)
        ) {
          this.messagesData.push({ id: doc.id, ...messageData });
        }
      });
      this.messagesData.sort((a: any, b: any) => a.timestamp - b.timestamp);
      this.checkForSelfChat();

      if (this.shouldScroll) {
        this.scrollAutoDown();
      }
    });
  }

  openThread(){
    this.threadOpened.emit(); 
  }

  splitMessage(text: string) {
    const regex = /(@[\w]+(?:\s[\w]+)?)/g;
    return text.split(regex);
  }

  isMention(part: string): boolean {
    if (!part.startsWith('@')) {
      return false;
    }
    const mentionName = part.substring(1);
    return this.getAllUsersName.some((user) => user.userName === mentionName);
  }



  @Output() userMention = new EventEmitter<any>();

  handleMentionClick(mention: string) {
   this.global.openMentionMessageBox=false
    const cleanName=mention.substring(1);
    const userRef=collection(this.firestore,'users')
    onSnapshot(userRef,(querySnapshot)=>{
     this.global.getUserByName={};
     querySnapshot.forEach((doc)=>{
      const dataUser=doc.data();
      const dataUserName=dataUser['name']
      if(dataUserName===cleanName){
          this.global.getUserByName={id:doc.id, ...dataUser}  
      }
      this.global.openMentionMessageBox=true
     })  
    })
  }

  getAllUsersName: any[] = [];

  getAllUsersname() {
    const userRef = collection(this.firestore, 'users');
    onSnapshot(userRef, (querySnapshot) => {
      this.getAllUsersName=[]
      querySnapshot.forEach((doc)=>{
        const dataUser=doc.data()
        const userName=dataUser['name']
        this.getAllUsersName.push({userName})
      })
    })
  }

  scrollHeightInput:any
 
  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const height=textarea.scrollTop = textarea.scrollHeight;
    this.scrollHeightInput=height;
    console.log(this.scrollHeightInput)
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



  async addEmoji(event: any, message: any) {
    console.log(message)
    const emoji = event.emoji.native; 
    this.shouldScroll = false;
  
    this.shouldScroll = false;
    if (this.global.currentUserData?.id === message.senderId) {
      message.senderchoosedStickereBackColor = emoji;
      message.stickerBoxCurrentStyle = true;
      if (message.senderSticker === emoji) {
        message.senderSticker = '';
        if (message.senderStickerCount === 2) {
          message.senderStickerCount = 1;
        }
      } else {
        message.senderSticker = emoji;
        message.senderStickerCount = 1;
      }
      if (message.recipientSticker === emoji) {
        message.recipientStickerCount =
          (message.recipientStickerCount || 1) + 1;
        message.senderSticker = '';
        if (message.recipientStickerCount === 2) {
          message.senderSticker = message.recipientSticker;
        }
        if (message.recipientStickerCount >= 3) {
          message.recipientStickerCount = 1;
        }
      }
      if (message.senderSticker !== message.recipientSticker) {
        message.recipientStickerCount = 1;
      }

      if (message.senderSticker === message.recipientSticker) {
        message.senderStickerCount = (message.senderStickerCount || 1) + 1;
      }
    } else if (this.global.currentUserData?.id !== message.senderId) {
      message.recipientChoosedStickerBackColor = emoji;
      message.stickerBoxCurrentStyle = true;
      if (message.recipientSticker === emoji) {
        message.recipientSticker = '';
        if (message.recipientStickerCount === 2) {
          message.recipientStickerCount = 1;
        }
      } else {
        message.recipientSticker = emoji;
        message.recipientStickerCount = 1;
      }
      if (message.senderSticker === emoji) {
        message.senderStickerCount = (message.senderStickerCount || 1) + 1;
        if (message.senderStickerCount >= 3) {
          message.senderStickerCount = 1;
        }
      }
      if (message.recipientSticker !== '' && message.senderStickerCount === 2) {
        message.senderStickerCount = 1;
        message.recipientSticker = emoji;
      }
      if (message.recipientSticker === message.senderSticker) {
        message.senderStickerCount = (message.senderStickerCount || 1) + 1;
      }
    }

    const messageData = this.messageData(
      message.senderStickerCount,
      message.recipientStickerCount
    );

    const strickerRef = doc(this.firestore, 'messages', message.id);
    const stikerObj = {
      senderSticker: message.senderSticker,
      senderStickerCount: message.senderStickerCount,
      recipientSticker: message.recipientSticker,
      recipientStickerCount: message.recipientStickerCount,
      senderchoosedStickereBackColor: message.senderchoosedStickereBackColor,
      recipientChoosedStickerBackColor:
      message.recipientChoosedStickerBackColor,
      stickerBoxCurrentStyle: message.stickerBoxCurrentStyle,
      stickerBoxOpacity: message.stickerBoxOpacity,
    };
    setTimeout(() => {
      this.shouldScroll = true;
    }, 100);
    await updateDoc(strickerRef, stikerObj);
  }

  toggleEmojiPicker(message:any) {
    this.checkEmojiId=message.id
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
    if (this.isEmojiPickerVisible) {
      setTimeout(() => {
        this.isEmojiPickerVisible = true;
      }, 0);
    }
  }

  checkEmojiId:any
  isEmojiPickerVisible: boolean = false;


}


