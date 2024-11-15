import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, SimpleChanges } from '@angular/core';
import {
  collection,
  CollectionReference,
  DocumentData,
  Firestore,
  onSnapshot,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { GlobalVariableService } from '../services/global-variable.service';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [CommonModule, PickerComponent],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss',
})
export class ChannelChatComponent implements OnInit {
  constructor() {}

  @Input() selectedChannel: any;

  firestore = inject(Firestore);
  global = inject(GlobalVariableService);

  messagesData: any[] = [];
  showThreadInfo: boolean = false;
  hoveredMessageId: string | null = null;

  unsubscribe: (() => void) | undefined;

  ngOnInit(): void {
    this.loadChannelMessages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedChannel'] && this.selectedChannel) {
      this.loadChannelMessages();
    }
  }

  loadChannelMessages() {
    if (!this.selectedChannel) {
      console.warn('No channel selected');
      return;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const messagesRef = collection(
      this.firestore,
      'channels',
      this.selectedChannel.id,
      'messages'
    );

    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    onSnapshot(q, (querySnapshot: any) => {
      this.messagesData = querySnapshot.docs.map((doc: any) => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.seconds) {
          data.timestamp = new Date(data.timestamp.seconds * 1000);
        }
        return { id: doc.id, ...data };
      });
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
