import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  arrayRemove,
  deleteField,
  doc,
  Firestore,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { checkActionCode } from '@angular/fire/auth';
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

  constructor() {}

  ngOnInit(): void {
    this.getCreaterData();
  }

  async getCreaterData() {
    const docRef = doc(this.db, 'users', this.channel.createdBy);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const user = docSnap.data();
      this.createdBy = user['name'];
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
      userIds: []
    };
    await updateDoc(channelRef, {
      userIds: arrayRemove(currentUserId),
    });
    this.workspaceService.setSelectedChannel(defaultChannel);
    console.log('cahnnelser',defaultChannel);
    this.closeDialog();
  }
}
