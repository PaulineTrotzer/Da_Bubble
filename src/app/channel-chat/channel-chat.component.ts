import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, SimpleChanges } from '@angular/core';
import {
  addDoc,
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
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { getAuth } from '@angular/fire/auth';

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
  isPickerVisible: string | null = null;
  currentUserLastEmojis: string [] = [];

  unsubscribe: (() => void) | undefined;

  ngOnInit(): void {
    this.loadChannelMessages();
    this.loadCurrentUserEmojis();
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

  addEmoji(event: any, messageId: string) {
    const emoji = event.emoji;
    this.isPickerVisible = null;
    this.addLastUsedEmoji(emoji);
    this.addToReactionInfo(emoji, messageId);
  }

  togglePicker(messageId: string) {
    this.isPickerVisible = this.isPickerVisible === messageId ? null : messageId;
  }

  async addLastUsedEmoji(emoji: any) {
    const auth = getAuth()
    const currentUserId = auth.currentUser?.uid
    if(currentUserId) {
      const docRef = doc(this.firestore, 'users', currentUserId);
      await updateDoc(docRef, {
        lastEmojis: [emoji.native, ...(await this.getExistingEmojis(docRef))].slice(0, 2),
      })
    }
  }

  async getExistingEmojis(userDocRef: DocumentReference): Promise<string[]> {
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    return userData?.['lastEmojis'] || [];
  }

  loadCurrentUserEmojis() {
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

  async addToReactionInfo(emoji: any, messageId: string) {
    const messageDocRef = doc(this.firestore, 'channels', this.selectedChannel.id, 'messages', messageId);
  
    try {
      const messageSnapshot = await getDoc(messageDocRef);
      const messageData = messageSnapshot.data();
      const reactions = messageData?.['reactions'] || {};
  
      const updatedReactions = {
        ...reactions,
        [emoji.native]: (reactions[emoji.native] || 0) + 1,
      };
  
      await updateDoc(messageDocRef, { reactions: updatedReactions });
  
      console.log(`Updated reactions for message ${messageId}:`, updatedReactions);
    } catch (error) {
      console.error('Error updating reactions:', error);
    }
  }
  
}
