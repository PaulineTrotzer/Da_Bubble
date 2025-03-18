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
  @Output() closeThread = new EventEmitter<void>();
  global = inject(GlobalVariableService);
  isFadingOut = false;
  constructor() {
    this.global.setThreadOpened(true);
  }

  ngOnDestroy(): void {
    this.global.setThreadOpened(false);
  }

  @Input() selectedUser: any;
  @Input() directThreadId: any;
  @Input() channelThreadId: any;
  @Input() selectedChannel: any;
  @Output() threadClosedToHome = new EventEmitter<void>();
  @Output() userSelectedFromThread = new EventEmitter<any>();
  @Output() userSelectedFromChannelThread = new EventEmitter<any>();
  @ViewChild(DirectThreadComponent) directThreadComp!: DirectThreadComponent;
  @ViewChild(ChannelThreadComponent) channelThreadComp!: ChannelThreadComponent;

  handleDirectThreadUserSelection(user: any) {
    this.userSelectedFromThread.emit(user);
  }

  handleChannelThreadSelection(channel: any) {
    this.userSelectedFromChannelThread.emit(channel);
  }

  animationDurationMs = 200;
  onDirectThreadClosed() {
    console.log('Thread => fade out...');
    this.isFadingOut = true;
    
    // NICHTS sonst, kein closeThread.emit() hier
    //  => Komponente bleibt noch im DOM
  
    setTimeout(() => {
      console.log('Thread => fade animation done => remove from DOM');
      this.closeThread.emit(); // => Home => *ngIf false
    }, this.animationDurationMs);
  }
  

  onChannelThreadClosed() {
    this.threadClosedToHome.emit();
  }
}
