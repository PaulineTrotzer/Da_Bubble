import { Component, inject, Input, OnInit } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  onSnapshot,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { GlobalVariableService } from '../services/global-variable.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { InputFieldComponent } from '../input-field/input-field.component';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  senderName: string;
  senderPicture: string;
  reactions: { [emoji: string]: string[] };
}

@Component({
  selector: 'app-channel-thread',
  standalone: true,
  imports: [CommonModule, InputFieldComponent],
  templateUrl: './channel-thread.component.html',
  styleUrl: './channel-thread.component.scss',
})
export class ChannelThreadComponent implements OnInit {
  constructor() {}

  channelThreadId: any;
  @Input() selectedChannel: any;

  db = inject(Firestore);
  global = inject(GlobalVariableService);
  auth = inject(AuthService);

  topicMessage: any;
  messages: Message[] = [];
  isChannelThreadOpen: boolean = false;
  isPickerVisible: string | null = null;
  hoveredMessageId: string | null = null;
  hoveredTopic: boolean = false;

  unsubscribe: (() => void) | undefined;

  ngOnInit(): void {
    this.global.channelThread$.subscribe((threadId) => {
      if (threadId) {
        this.channelThreadId = threadId;
        this.getTopic();
      }
    });
    this.loadThreadMessages();
    this.toggleChannelThread(true);
  }

  toggleChannelThread(status: boolean) {
    this.isChannelThreadOpen = status;
  }

  async getTopic() {
    this.messages = [];
    const docRef = doc(
      this.db,
      'channels',
      this.selectedChannel.id,
      'messages',
      this.channelThreadId
    );
    onSnapshot(docRef, async (doc) => {
      const data = doc.data();
      if (data) {
        if (data['timestamp']?.seconds) {
          data['timestamp'] = new Date(data['timestamp'].seconds * 1000);
        }
        this.topicMessage = data;
      }
    });
  }

  async loadThreadMessages() {
    if (!this.channelThreadId) {
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
      this.channelThreadId,
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
  }
}
