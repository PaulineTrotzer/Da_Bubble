import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { arrayUnion, collection, doc, Firestore, onSnapshot, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-add-member',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-add-member.component.html',
  styleUrl: './dialog-add-member.component.scss'
})
export class DialogAddMemberComponent implements OnInit {
  constructor(){}

  channel = inject(MAT_DIALOG_DATA);
  dialog = inject(MatDialog)
  db = inject(Firestore)
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedUsers: any[] = [];
  searchInput: string = '';

  ngOnInit(): void {
    this.getAllUsers();
  }

  getAllUsers() {
    const colRef = collection(this.db, 'users');
    const docRef = onSnapshot(colRef, (user) => {
      user.forEach((doc) => {
        this.allUsers.push(doc.data());
      });
    });
  }

  closeDialog() {
    this.dialog.closeAll()
  }

  onSubmit() {
    if(this.selectedUsers.length > 0) {
      this.addSelectedUsersToChannel();
    }
  }

  searchUser() {
    this.filteredUsers = [];
    if (this.searchInput) {
      this.filteredUsers = [];
      const searchTerm = this.searchInput.toLowerCase();
      this.filteredUsers = this.allUsers.filter((user) => {
        return (
          user.name && user.name.toLowerCase().includes(searchTerm)
        );
      });
    }
  }

  selectUser(index: number) {
    const selectedUser = this.filteredUsers[index];
    if (!this.selectedUsers.includes(selectedUser)) {
      this.selectedUsers.push(selectedUser);
    }
    this.allUsers = this.allUsers.filter(
      (user) => user.uid !== selectedUser.uid
    );
    this.filteredUsers = this.filteredUsers.filter(
      (user) => user.uid !== selectedUser.uid
    );
    this.searchInput = '';
  }

  deleteUser(index: number) {
    const removedUser = this.selectedUsers[index];
    this.selectedUsers.splice(index, 1);
    if (!this.allUsers.some((user) => user.uid === removedUser.uid)) {
      this.allUsers.push(removedUser);
    }
    if (this.searchInput) {
      this.searchUser();
    }
  }

  private async addSelectedUsersToChannel() {
    const userIds = this.selectedUsers.map(user => user.uid);
    await this.updateChannelUserIds(userIds);
    this.closeDialog();
  }

  private async updateChannelUserIds(userIds: string[]) {
    const channelRef = doc(this.db, 'channels', this.channel.id);
    try {
      await updateDoc(channelRef, {
        userIds: arrayUnion(...userIds)
      });
      console.log('Users added successfully to the channel');
    } catch (error) {
      console.error('Error adding users to the channel:', error);
    }
  }
}
