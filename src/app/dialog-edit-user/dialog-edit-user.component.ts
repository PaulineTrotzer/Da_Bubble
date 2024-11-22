import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, Output, EventEmitter, Input } from '@angular/core';
import { User } from '../models/user.class';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../services/user.service';
import { Firestore } from '@angular/fire/firestore';
import { updateDoc, doc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { OverlayStatusService } from '../services/overlay-status.service';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-dialog-edit-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-edit-user.component.html',
  styleUrl: './dialog-edit-user.component.scss'
})
export class DialogEditUserComponent implements OnInit {
  user: User = new User();
  editModusOpen = true;
  userID: any;
  userservice = inject(UserService)
  editCardOpen = true;
  firestore = inject(Firestore);
  overlayStatusService = inject(OverlayStatusService);
  @Output() closeEditDialog= new EventEmitter<void>();
  @Input() guestAccount: boolean = false; 
  global=inject(GlobalVariableService);


  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.userID = paramMap.get('id');
      if (this.userID) {
        const userResult = await this.userservice.getUser(this.userID);
        if (userResult) {
          this.user = userResult;
        }
        console.log('aaand' ,this.global.googleAccountLogIn);
      }
    });
  }

  closeEditModus(){
    this.editCardOpen = false;
    this.overlayStatusService.setOverlayStatus(false);
    this.closeEditDialog.emit();
  }

  async saveUser() {
    try {
      const userRef = doc(this.firestore, 'users', this.userID);
      await updateDoc(userRef, {
        name: this.user.name,
        email: this.user.email,
      });
      this.closeEditModus();
    } catch (error) {
      console.error('error updating user:', error);
    }
  }

  showEditableInput(): boolean {
    return !this.guestAccount && !this.global.googleAccountLogIn;
  }
}
