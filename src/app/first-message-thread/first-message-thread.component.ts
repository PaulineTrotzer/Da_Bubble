import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-first-message-thread',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './first-message-thread.component.html',
  styleUrl: './first-message-thread.component.scss',
})
export class FirstMessageThreadComponent implements OnInit {
  @Input() firstMessageID: string | null = null;
  @Input() selectedUser: any;
  currentUser: any;
  firstThreadMessage: any;
  @Input() currentThreadMessage: {
    id?: string | undefined;
    senderName?: string;
    recipientName?: string;
    text?: string;
    senderPicture?: string;
    timestamp?: Date | { seconds: number; nanoseconds: number };
    senderId?: string;
    isHovered?: boolean;
  } = {};

  ngOnInit(): void {
  }


  getFormattedTimestamp(): Date | null {
    if (!this.currentThreadMessage?.timestamp) {
      return null;
    }
    const timestamp = this.currentThreadMessage.timestamp;
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (
      typeof timestamp === 'object' &&
      'seconds' in timestamp &&
      'nanoseconds' in timestamp
    ) {
      return new Date(
        timestamp.seconds * 1000 + timestamp.nanoseconds / 1_000_000
      );
    }
    return null;
  }
}
