import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  MatDialogModule,
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import {
  arrayUnion,
  collection,
  doc,
  Firestore,
  getDoc,
  onSnapshot,
  updateDoc,
} from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-dialog-add-user',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './dialog-add-user.component.html',
  styleUrl: './dialog-add-user.component.scss',
})
export class DialogAddUserComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelId: string, userId: string},
    private db: Firestore,
    private dialogRef: MatDialogRef<DialogAddUserComponent>,
  ) {}
  readonly dialog = inject(MatDialog);
  isHovered: boolean = false;
  channel: any = {};
  searchInput: string = '';
  addAllUsers: boolean = true;
  selectUsers: boolean = false;
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedUsers: any[] = [];

  ngOnInit(): void {
    this.getCreatedChannel(this.data.channelId);
    this.getAllUsers();
  }

  async onSubmit(form: any) {
    if (this.addAllUsers && form.valid) {
      await this.addAllUsersToChannel();
    } else if (this.selectUsers && this.selectedUsers.length > 0) {
      await this.addSelectedUsersToChannel();
    }
    this.dialogRef.close(true);
  }

  private async addAllUsersToChannel() {
    const userIds = this.allUsers.map(user => user.uid);
    await this.updateChannelUserIds(userIds);
  }

  private async addSelectedUsersToChannel() {
    const userIds = this.selectedUsers.map(user => user.uid);
    await this.updateChannelUserIds(userIds);
  }

  private async updateChannelUserIds(userIds: string[]) {
    const channelRef = doc(this.db, 'channels', this.data.channelId);
    try {
      await updateDoc(channelRef, {
        userIds: arrayUnion(...userIds),
        createdBy: this.data.userId || ''
      });
      console.log('Users added successfully to the channel');
    } catch (error) {
      console.error('Error adding users to the channel:', error);
    }
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  getAllUsers() {
    const colRef = collection(this.db, 'users');
    const docRef = onSnapshot(colRef, (user) => {
      user.forEach((doc) => {
        this.allUsers.push(doc.data());
      });
    });
  }

  async getCreatedChannel(channelId: string) {
    const docRef = doc(this.db, 'channels', channelId);
    const docSnap = await getDoc(docRef);
    this.channel = docSnap.data();
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

  toggleHover() {
    this.isHovered = !this.isHovered;
  }

  toggleAllUsers() {
    this.addAllUsers = true;
    this.selectUsers = false;
    this.updateDialogHeight();
  }

  toggleSelectUsers() {
    this.addAllUsers = false;
    this.selectUsers = true;
    this.updateDialogHeight();
  }

  updateDialogHeight() {
    if (this.selectUsers) {
      this.dialogRef.updateSize('710px', '354px'); // Set height to 500px when selectUsers is true
    } else {
      this.dialogRef.updateSize('710px', '310px'); // Set height to 300px when selectUsers is false
    }
  }
}
