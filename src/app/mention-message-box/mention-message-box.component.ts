import { Component, Input, OnInit, SimpleChanges, } from '@angular/core';
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

  constructor(public global: GlobalVariableService) {

  }


  ngOnInit(): void {
    if (this.global.getUserByName) {
      console.log(this.global.getUserByName?.name)
    }

    console.log(this.global.getUserByName?.id)
  }



  cancelCard() {
    this.global.openMentionMessageBox = false
  }

}
