import { Component, OnInit, inject } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { WorkspaceComponent } from '../workspace/workspace.component';
import { StartScreenComponent } from '../start-screen/start-screen.component';
import { ThreadComponent } from '../thread/thread.component';
import { GlobalVariableService } from '../services/global-variable.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeaderComponent,
    WorkspaceComponent,
    StartScreenComponent,
    ThreadComponent,
    CommonModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  selectedUser: any;
  selectedChannel: any;
  mentionUser: any;
  globalService = inject(GlobalVariableService);
  isThreadOpen = false;

  ngOnInit(): void {
    
  }



  onUserSelected(user: any) {
    this.selectedUser = user;
    this.selectedChannel = null;
    this.globalService.clearCurrentChannel();
  }

  onChannelSelected(channel: any) {
    this.selectedChannel = channel;
    this.selectedUser = null;
    this.globalService.setCurrentChannel(channel);
  }

  onThreadOpened() {
    this.isThreadOpen = true;
  }

  onThreadClosed() {
    this.isThreadOpen = false;
  }
}
