import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { collection, CollectionReference, DocumentData, Firestore, onSnapshot, orderBy, query } from '@angular/fire/firestore';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss'
})
export class ChannelChatComponent implements OnInit {
  constructor(){}

  firestore = inject(Firestore)
  global = inject(GlobalVariableService);

  @Input() selectedChannel: any;

  messagesData: any[] = []
  showThreadInfo: boolean = false;

  ngOnInit(): void {
    this.loadChannelMessages();
  }

  loadChannelMessages() {
    if (!this.selectedChannel) {
       console.warn('No channel selected');
       return;
    }
 
    const messagesRef = collection(this.firestore, 'channels', this.selectedChannel.id, 'messages');
 
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
}
