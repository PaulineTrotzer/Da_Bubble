import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DirectThreadComponent } from '../direct-thread/direct-thread.component';
import { ChannelThreadComponent } from '../channel-thread/channel-thread.component';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, DirectThreadComponent, ChannelThreadComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent implements OnDestroy {
  global = inject(GlobalVariableService);
  isFadingOut = false;
  animationDurationMs = 200;
  @Output() closeThread = new EventEmitter<void>();
  @Input() selectedUser: any;
  @Input() directThreadId: any;
  @Input() channelThreadId: any;
  @Input() selectedChannel: any;
  @Output() threadClosedToHome = new EventEmitter<void>();
  @Output() userSelectedFromThread = new EventEmitter<any>();
  @Output() userSelectedFromChannelThread = new EventEmitter<any>();
  @ViewChild(DirectThreadComponent) directThreadComp!: DirectThreadComponent;
  @ViewChild(ChannelThreadComponent) channelThreadComp!: ChannelThreadComponent;

  constructor() {
    this.global.setThreadOpened(true);
  }

  ngOnDestroy(): void {
    this.global.setThreadOpened(false);
  }

  handleDirectThreadUserSelection(user: any) {
    this.userSelectedFromThread.emit(user);
  }

  handleChannelThreadSelection(channel: any) {
    this.userSelectedFromChannelThread.emit(channel);
  }

  onDirectThreadClosed() {
    this.isFadingOut = true;
    setTimeout(() => {
      this.closeThread.emit();
    }, this.animationDurationMs);
  }

  onChannelThreadClosed() {
    this.threadClosedToHome.emit();
  }
}
