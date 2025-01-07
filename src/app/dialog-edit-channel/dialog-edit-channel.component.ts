import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, inject, OnInit, ViewChild } from '@angular/core';
import {
  arrayRemove,
  deleteField,
  doc,
  Firestore,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { DialogChannelUserComponent } from '../dialog-channel-user/dialog-channel-user.component';
import { WorkspaceService } from '../services/workspace.service';

@Component({
  selector: 'app-dialog-edit-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogChannelUserComponent],
  templateUrl: './dialog-edit-channel.component.html',
  styleUrl: './dialog-edit-channel.component.scss',
})
export class DialogEditChannelComponent implements OnInit {
  db: Firestore = inject(Firestore);
  authService = inject(AuthService);
  channel = inject(MAT_DIALOG_DATA);
  dialog = inject(MatDialog);
  createdBy: string = '';
  isEditingName: boolean = false;
  isEditingDescription: boolean = false;
  workspaceService = inject(WorkspaceService);
  @ViewChild('firstFocusable', { static: true }) firstFocusable: ElementRef | undefined;

  constructor(    @Inject(MAT_DIALOG_DATA) public data: any,
  private dialogRef: MatDialogRef<DialogEditChannelComponent>) {}

  ngOnInit(): void {
    if (this.firstFocusable) {
      this.firstFocusable.nativeElement.focus();
    }
    this.getCreaterData();
  }

  async getCreaterData() {
    if (!this.channel || !this.channel.createdBy) {
      console.error('Kanal oder "createdBy" fehlen!');
      return;
    }
    try {
      const docRef = doc(this.db, 'users', this.channel.createdBy);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const user = docSnap.data();
        this.createdBy = user['name'];
      } else {
        console.warn('User-Dokument existiert nicht.');
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Benutzerdaten:', error);
    }
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  editName() {
    this.isEditingName = true;
  }

  editDescription() {
    this.isEditingDescription = true;
  }

  async saveName() {
    this.isEditingName = false;
    const channelRef = doc(this.db, 'channels', this.channel.id);
    await updateDoc(channelRef, {
      name: this.channel.name,
    });
  }

  async saveDescription() {
    this.isEditingDescription = false;
    const channelRef = doc(this.db, 'channels', this.channel.id);
    await updateDoc(channelRef, {
      description: this.channel.description,
    });
  }

  async leaveChannel() {
    const currentUserId = this.authService.currentUser.uid;
    const channelRef = doc(this.db, 'channels', this.channel.id);
    const defaultChannel = {
      id: 'validChannelId',
      name: 'Willkommen',
      userIds: [],
    };
    await updateDoc(channelRef, {
      userIds: arrayRemove(currentUserId),
    });
    this.workspaceService.setSelectedChannel(defaultChannel);
    console.log('cahnnelser', defaultChannel);
    this.closeDialog();
  }
}
