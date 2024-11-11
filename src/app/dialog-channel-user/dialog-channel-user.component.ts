import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { User } from '../models/user.class';
import { doc, Firestore } from '@angular/fire/firestore';
import { getDoc } from '@firebase/firestore';
import { DialogAddMemberComponent } from '../dialog-add-member/dialog-add-member.component';
import { DialogMemberProfileCardComponent } from '../dialog-member-profile-card/dialog-member-profile-card.component';

@Component({
  selector: 'app-dialog-channel-user',
  standalone: true,
  imports: [CommonModule, DialogMemberProfileCardComponent],
  templateUrl: './dialog-channel-user.component.html',
  styleUrl: './dialog-channel-user.component.scss'
})
export class DialogChannelUserComponent implements OnInit{
  constructor(){}
  
  data = inject(MAT_DIALOG_DATA);
  members = this.data.members;
  channel = this.data.channel;
  db = inject(Firestore)
  dialog = inject(MatDialog)
  user: User = new User();
  allMembers: any[] = [];
  detailedMember: any;
  showDetails: boolean = false;

  ngOnInit(): void {
    this.getUserData()
  }

  getUserData() {
    this.members.forEach(async (memberId: string) => {
      const docRef = doc(this.db, 'users', memberId);
      const userDoc = await getDoc(docRef);
      if(userDoc.data()){
        this.allMembers.push(userDoc.data());
      }
    })
  }

  closeDialog() {
    this.dialog.closeAll()
  }

  openAddMemberDialog() {
    this.closeDialog();
    this.dialog.open(DialogAddMemberComponent, {
      data: this.channel,
      panelClass: 'add-member-dialog',
      maxWidth: '514px',
      maxHeight: '294px', 
    })
  }

  openProfileDialog(member: any){
    console.log(member)
    this.closeDialog();
    this.dialog.open(DialogMemberProfileCardComponent, {
      data: member,
      panelClass: 'member-profile-card',
      maxWidth: '500px',
      maxHeight: '705px', 
    })
  }
}
