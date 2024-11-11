import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';

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

  ngOnInit(): void {
    
  }

  closeDialog() {
    this.dialog.closeAll()
  }
}
