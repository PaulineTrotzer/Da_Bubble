import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-member-profile-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog-member-profile-card.component.html',
  styleUrl: './dialog-member-profile-card.component.scss'
})
export class DialogMemberProfileCardComponent implements OnInit {
  constructor(){}
  member = inject(MAT_DIALOG_DATA)
  dialog = inject(MatDialog)
  dialogRef = inject(MatDialogRef<DialogMemberProfileCardComponent>); 

  ngOnInit(): void {
    
  }

  closeDialog() {
    this.dialog.closeAll()
  }

  enterByUsername() {
    this.dialogRef.close(this.member);
  }
}
