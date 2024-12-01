import { Component, inject, Input, OnInit } from '@angular/core';
import { doc, Firestore, onSnapshot } from '@angular/fire/firestore';
import { GlobalVariableService } from '../services/global-variable.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { InputFieldComponent } from '../input-field/input-field.component';

@Component({
  selector: 'app-channel-thread',
  standalone: true,
  imports: [CommonModule, InputFieldComponent],
  templateUrl: './channel-thread.component.html',
  styleUrl: './channel-thread.component.scss'
})
export class ChannelThreadComponent implements OnInit{

  constructor(){}

  @Input() channelThreadId: any;
  @Input() selectedChannel: any;

  db = inject(Firestore);
  global = inject(GlobalVariableService);
  auth = inject(AuthService);

  topicMessage: any;

  ngOnInit(): void {
    this.global.channelThread$.subscribe((threadId) => {
      if (threadId) {
        this.channelThreadId = threadId;
        this.getTopic();
      }
    });
  }

  getTopic() {
    const docRef = doc(this.db, 'channels', this.selectedChannel.id, 'messages', this.channelThreadId);
    onSnapshot(docRef, (doc) => {
      const data = doc.data();
      if (data) {
        // Convert Firestore timestamp to Date
        if (data['timestamp']?.seconds) {
          data['timestamp'] = new Date(data['timestamp'].seconds * 1000);
        }
        this.topicMessage = data;
      }
    });
  }

}
