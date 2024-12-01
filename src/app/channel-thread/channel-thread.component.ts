import { Component, inject, Input, OnInit } from '@angular/core';
import { doc, Firestore, onSnapshot } from '@angular/fire/firestore';
import { GlobalVariableService } from '../services/global-variable.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-channel-thread',
  standalone: true,
  imports: [],
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
      this.topicMessage = doc.data();
    })
  }

}
