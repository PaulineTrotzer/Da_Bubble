import {
  Component,
  Output,
  EventEmitter,
  inject,
  OnInit,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectThreadComponent } from '../direct-thread/direct-thread.component';
import { ChannelThreadComponent } from '../channel-thread/channel-thread.component';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, DirectThreadComponent, ChannelThreadComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})

export class ThreadComponent {
  @Output() closeThread = new EventEmitter<void>();

  constructor(){}

  @Input() selectedUser: any;
  @Input() directThreadId: any;
  @Input() channelThreadId: any;
  @Input() selectedChannel: any;
  @Output() userSelectedFromThread = new EventEmitter<any>();
  @Output() userSelectedFromChannelThread = new EventEmitter<any>();
  @ViewChild(DirectThreadComponent) directThreadComp!: DirectThreadComponent;
  @ViewChild(ChannelThreadComponent) channelThreadComp!: ChannelThreadComponent;


  ngAfterViewInit(): void {
 /*    if (this.directThreadId) {
      this.focusDirectThreadInput();
    } */
    if (this.channelThreadId) {
      this.focusChannelThreadInput();
    }
  }

/*   focusDirectThreadInput(): void {
    if (this.directThreadComp) {
      this.directThreadComp.focusInputField();
    }
  } */

  focusChannelThreadInput(): void {
    if (this.channelThreadComp) {
      this.channelThreadComp.focusInputField();
    }
  }


  handleDirectThreadUserSelection(user: any) {
    this.userSelectedFromThread.emit(user);
  }

  handleChannelThreadSelection(channel: any) {
    this.userSelectedFromChannelThread.emit(channel);
  }

  onDirectThreadClosed() {
    this.closeThread.emit(); 
  }

}
