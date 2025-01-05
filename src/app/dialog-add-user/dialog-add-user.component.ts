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
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { User } from '../models/user.class';
import { MemberDataService } from '../services/member-data.service';

@Component({
  selector: 'app-dialog-add-user',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FormsModule],
  templateUrl: './dialog-add-user.component.html',
  styleUrl: './dialog-add-user.component.scss',
})
export class DialogAddUserComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { channelId: string; userId: string },
    private db: Firestore,
    private dialogRef: MatDialogRef<DialogAddUserComponent>,
    private route: ActivatedRoute
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
  currentUser: any;
  currentUserId: any;
  global = inject(GlobalVariableService);
  firestore=inject(Firestore);
  memberDataService=inject(MemberDataService);

  async ngOnInit(): Promise<void> {
    this.getCreatedChannel(this.data.channelId);
    this.getAllUsers();
    await this.loadUserData();
  }

  async loadUserData(): Promise<void> {
    this.currentUserId = this.route.snapshot.paramMap.get('id');
    this.currentUser = this.currentUserId;
    await this.getcurrentUserById(this.currentUserId);
  }

  async getcurrentUserById(userId: string) {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        this.global.currentUserData = {
          id: userSnapshot.id,
          ...userSnapshot.data(),
        };
      }
    } catch (error) {
      console.error('Fehler beim Abruf s Benutzers:', error);
    }
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
    const userIds = this.allUsers.map((user) => user.uid);
    await this.updateChannelUserIds(userIds);
  }

  private async addSelectedUsersToChannel() {
    const userIds = this.selectedUsers.map((user) => user.uid);
    if (this.currentUser) {
      userIds.push(this.currentUser.uid);
    }
    await this.updateChannelUserIds(userIds);
  }

   async updateChannelUserIds(userIds: string[]) {
    const channelRef = doc(this.db, 'channels', this.data.channelId);
    try {
      // Update der User-IDs im Kanal-Dokument
      await updateDoc(channelRef, {
        userIds: arrayUnion(...userIds),
        createdBy: this.data.userId || '',
      });
  
      // Hole die aktuellen Benutzer des Kanals und setze sie im Service
      const updatedChannelDoc = await getDoc(channelRef);
      if (updatedChannelDoc.exists()) {
        const channelData = updatedChannelDoc.data();
        const userIdsInChannel = channelData?.['userIds'] || [];
  
        // Hole die Benutzerdaten aus Firestore
        const usersRef = collection(this.db, 'users');
        const usersQuery = query(usersRef, where('uid', 'in', userIdsInChannel));
        const querySnapshot = await getDocs(usersQuery);
  
        const members = querySnapshot.docs.map((doc) => doc.data());
        
        // Setze die Mitglieder im Service
        this.memberDataService.setMembers(members);
  
        console.log('Users added successfully to the channel');
      }
    } catch (error) {
      console.error('Error adding users to the channel:', error);
    }
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
        return user.name && user.name.toLowerCase().includes(searchTerm);
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
      this.dialogRef.updateSize('710px', '354px');
    } else {
      this.dialogRef.updateSize('710px', '310px');
    }
  }
}
