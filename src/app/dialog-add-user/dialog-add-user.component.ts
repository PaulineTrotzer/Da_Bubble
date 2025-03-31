import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, inject, OnInit } from '@angular/core';
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
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { MemberDataService } from '../services/member-data.service';

@Component({
  selector: 'app-dialog-add-user',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './dialog-add-user.component.html',
  styleUrl: './dialog-add-user.component.scss',
})
export class DialogAddUserComponent implements OnInit {
  readonly dialog = inject(MatDialog);
  isHovered: boolean = false;
  channel: any = {};
  searchInput: string = '';
  addAllUsers: boolean = true;
  selectUsers: boolean = false;
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedUsers: any[] = [];
  currentUser: any;
  currentUserId: any;
  global = inject(GlobalVariableService);
  firestore = inject(Firestore);
  memberDataService = inject(MemberDataService);
  data = inject(MAT_DIALOG_DATA) as { channelId: string; userId: string };

  constructor(
    private db: Firestore,
    private dialogRef: MatDialogRef<DialogAddUserComponent>,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.getCreatedChannel(this.data.channelId);
    this.getAllUsers();
  }

  async onSubmit(form: any) {
    if (!this.isFormValid()) {
      return;
    }
    if (this.addAllUsers) {
      await this.addAllUsersToChannel();
    } else if (this.selectUsers) {
      await this.addSelectedUsersToChannel();
    }
    this.dialogRef.close(true);
  }

  async addAllUsersToChannel() {
    const userIds = this.allUsers.map((user) => user.uid);
    await this.updateChannelUserIds(userIds);
  }

  async addSelectedUsersToChannel() {
    const selectedUsersWithCurrentUser = [
      ...this.selectedUsers,
      this.global.currentUserData,
    ];
    const userIds = selectedUsersWithCurrentUser.map((user) => user.uid);
    await this.updateChannelUserIds(userIds);
  }

  async updateChannelUserIds(userIds: string[]) {
    const channelRef = doc(this.db, 'channels', this.data.channelId);
    try {
      await updateDoc(channelRef, {
        userIds: arrayUnion(...userIds),
        createdBy: this.data.userId || '',
      });
      const updatedChannelDoc = await getDoc(channelRef);
      if (updatedChannelDoc.exists()) {
        const channelData = updatedChannelDoc.data();
        const userIdsInChannel = channelData?.['userIds'] || [];
        const usersRef = collection(this.db, 'users');
        const usersQuery = query(
          usersRef,
          where('uid', 'in', userIdsInChannel)
        );
        const querySnapshot = await getDocs(usersQuery);

        const members = querySnapshot.docs.map((doc) => doc.data());
        this.memberDataService.setMembers(members);
      }
    } catch (error) {
      console.error('Error adding users to the channel:', error);
    }
  }

  isFormValid(): boolean {
    if (this.addAllUsers) {
      return true;
    }
    if (this.selectUsers && this.selectedUsers.length > 0) {
      return true;
    }
    return false;
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  getAllUsers() {
    const colRef = collection(this.db, 'users');
    onSnapshot(colRef, (snapshot) => {
      this.allUsers = snapshot.docs.map((doc) => doc.data());
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
          user.name &&
          user.name.toLowerCase().includes(searchTerm) &&
          user.name !== 'Gast'
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
    this.updateFormState();
  }

  updateFormState() {
    setTimeout(() => {
      this.isFormValid();
    });
  }

  toggleHover() {
    this.isHovered = !this.isHovered;
  }

  toggleAllUsers() {
    this.addAllUsers = true;
    this.selectUsers = false;
    this.selectedUsers = [];
    this.updateDialogHeight();
  }

  toggleSelectUsers() {
    this.addAllUsers = false;
    this.selectUsers = true;
    this.updateDialogHeight();
  }

  updateDialogHeight() {
    if (this.selectUsers) {
      this.dialogRef.updateSize('710px', '354px');
    } else {
      this.dialogRef.updateSize('710px', '310px');
    }
  }
}
