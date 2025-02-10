import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { User } from '../models/user.class';
import { doc, Firestore } from '@angular/fire/firestore';
import { getDoc } from '@firebase/firestore';
import { DialogAddMemberComponent } from '../dialog-add-member/dialog-add-member.component';
import { DialogMemberProfileCardComponent } from '../dialog-member-profile-card/dialog-member-profile-card.component';
import { WorkspaceService } from '../services/workspace.service';
import { Subscription } from 'rxjs';
import { MemberDataService } from '../services/member-data.service';

@Component({
  selector: 'app-dialog-channel-user',
  standalone: true,
  imports: [CommonModule, DialogMemberProfileCardComponent],
  templateUrl: './dialog-channel-user.component.html',
  styleUrl: './dialog-channel-user.component.scss',
})
export class DialogChannelUserComponent implements OnInit {
  constructor() {}
  @Output() enterChat = new EventEmitter<any>();
  data = inject(MAT_DIALOG_DATA);
  members = this.data.members;
  channel = this.data.channel;
  db = inject(Firestore);
  dialog = inject(MatDialog);
  user: User = new User();
  allMembers: any[] = [];
  detailedMember: any;
  showDetails: boolean = false;
  workspaceService = inject(WorkspaceService);
  memberDataService = inject(MemberDataService);
  membersSubscription?: Subscription;
  channelSubscription?: Subscription;
  guest = true;

  ngOnInit(): void {
    this.subscribeMembers();
    this.subscribeChannel();
  }

  subscribeMembers() {
    this.membersSubscription = this.memberDataService.members$.subscribe({
      next: (members) => {
        this.allMembers = members.filter((m) => m?.name && m.name !== 'Gast');
      },
      error: (err) => {
        console.error('Fehler beim Abrufen der Mitglieder:', err);
      },
    });
  }

  subscribeChannel() {
    this.channelSubscription = this.memberDataService.channel$.subscribe({
      next: (channel) => {
        this.channel = channel;
      },
      error: (err) => {
        console.error('Fehler beim Abrufen des Channels:', err);
      },
    });
  }

  ngOnDestroy() {
    if (this.membersSubscription) {
      this.membersSubscription.unsubscribe();
    }
    if (this.channelSubscription) {
      this.channelSubscription.unsubscribe();
    }
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  openAddMemberDialog() {
    const channel = this.workspaceService.selectedChannelSubject.value;

    if (!channel) {
      console.warn('Kein Channel ausgewählt, kann Dialog nicht öffnen!');
      return;
    }
    this.dialog.closeAll();
    this.dialog.open(DialogAddMemberComponent, {
      data: channel,
      panelClass: 'add-member-dialog',
      maxWidth: '514px',
      maxHeight: '294px',
    });
  }

  openProfileDialog(member: any) {
    this.closeDialog();
    const dialogRef = this.dialog.open(DialogMemberProfileCardComponent, {
      data: member,
      panelClass: 'member-profile-card',
      maxWidth: '500px',
      maxHeight: '705px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.workspaceService.setSelectedUser(result);
      }
    });
  }
}
