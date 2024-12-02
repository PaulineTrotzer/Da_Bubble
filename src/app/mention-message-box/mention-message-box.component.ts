import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges,inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { GlobalVariableService } from '../services/global-variable.service';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-mention-message-box',
  standalone: true,
  imports: [MatCardModule, CommonModule],
  templateUrl: './mention-message-box.component.html',
  styleUrl: './mention-message-box.component.scss'
})



export class MentionMessageBoxComponent implements OnInit {

  global=inject(GlobalVariableService);
  @Output() enterChatUser=new EventEmitter<any>();

  ngOnInit(): void {
    if (this.global.getUserByName) {
    }
  }

  cancelCard() {
    this.global.openMentionMessageBox = false
  }
  
  enterChat(user:any){
     this.enterChatUser.emit(user)
  }

}