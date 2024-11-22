import {
  Component,
  Output,
  EventEmitter,
  inject,
  OnInit,
  Input,
} from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { GlobalVariableService } from '../services/global-variable.service';
import { User } from '../models/user.class';
import { Firestore, doc, getDoc, collection, where, query, getDocs, limit, onSnapshot } from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { SendMessageInfo } from '../models/send-message-info.interface';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
  animations: [
    trigger('slideFromRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(50%)' }),
        animate(
          '125ms ease-in-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '125ms ease-in-out',
          style({ opacity: 0, transform: 'translateX(50%)' })
        ),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('125ms ease-in-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('125ms ease-in-out', style({ opacity: 0 })),
      ]),
    ]),
  ],
})

export class ThreadComponent implements OnInit {
[x: string]: any;
  @Output() closeThread = new EventEmitter<void>();
  chatMessage: string = '';
  showTopicBubble: boolean = false;
  showMessageBubble: boolean = false;
  showUserBubble: boolean = false;
  showMessagePopup: boolean = false;
  showUserPopup: boolean = false;
  global = inject(GlobalVariableService);
  currentUser: User = new User();
  firestore = inject(Firestore);
  userService = inject(UserService);
  @Input() selectedUser: any;
  userID: any | null = null;
  messagesData: any[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.userID = paramMap.get('id');
      if (this.userID) {
        const userResult = await this.userService.getUser(this.userID);
        if (userResult) {
          this.currentUser = userResult;
        }
      }
      console.log('suser', this.selectedUser);
      this.getMessages();
    });
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
        this.userService.observingUserChanges(userId, (updatedUser: User) => {
          this.selectedUser = updatedUser;
        });
      }
    } catch (error) {
      console.error('Fehler beim Abruf s Benutzers:', error);
    }
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
      console.log('Messages retrieved:', querySnapshot);
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
      this.messagesData.sort((a: any, b: any) => a.timestamp - b.timestamp)

    });
  
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
  toggleTopicBubble() {
    this.showTopicBubble = !this.showTopicBubble;
  }
  toggleMessageBubble() {
    this.showMessageBubble = !this.showMessageBubble;
  }
  toggleUserBubble() {
    this.showUserBubble = !this.showUserBubble;
  }
  toggleMessagePopup() {
    this.showMessagePopup = !this.showMessagePopup;
  }
  toggleUserPopup() {
    this.showUserPopup = !this.showUserPopup;
  }

  onClose() {
    this.closeThread.emit();
  }
}
