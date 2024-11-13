import {
  Firestore,
  Unsubscribe,
  collection,
  doc,
  getDoc,
  onSnapshot,
} from '@angular/fire/firestore';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DialogCreateChannelComponent } from '../dialog-create-channel/dialog-create-channel.component';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  Output,
  EventEmitter,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, MatDialogModule, DialogCreateChannelComponent],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
})
export class WorkspaceComponent implements OnInit {
  selectedChannel: any = null;
  channelDrawerOpen: boolean = true;
  messageDrawerOpen: boolean = true;
  userId: any | null = null;
  route = inject(ActivatedRoute);
  firestore = inject(Firestore);
  userData: any = {};
  allUsers: any = [];
  allChannels: Channel[] = [];
  user: User = new User();
  unsub?: () => void;
  checkUsersExsists: boolean = false;
  userService = inject(UserService);
  @Output() userSelected = new EventEmitter<any>();
  @Output() channelSelected = new EventEmitter<Channel>();
  readonly dialog = inject(MatDialog);
  private channelsUnsubscribe: Unsubscribe | undefined;

  constructor(public global: GlobalVariableService) {}

  selectUser(user: any) {
    this.userSelected.emit(user);
    this.global.statusCheck = false;
  }

  selectCurrentUser() {
    this.global.statusCheck = true;
    this.userSelected.emit(this.global.currentUserData);
  }

  openDialog() {
    const dialogRef = this.dialog.open(DialogCreateChannelComponent, {
      data: {
        userId: this.userId,
      },
      height: '539px',
      width: '872px',
    });
    dialogRef.afterClosed().subscribe((result) => {
      this.getAllChannels();
    });
  }

  async ngOnInit(): Promise<void> {
    this.getAllUsers();
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.getUserById(this.userId);
      this.userService.observingUserChanges(
        this.userId,
        (updatedUser: User) => {
          this.global.currentUserData.name = updatedUser.name;
        }
      );
    }
    await this.getAllChannels();
  }

  findWelcomeChannel() {
    const willkommenChannel = this.allChannels.find(channel => channel.name == 'Willkommen');
    if(willkommenChannel){
      this.selectChannel(willkommenChannel);
    }
  }

  ngOnDestroy(): void {
    if (this.channelsUnsubscribe) {
      this.channelsUnsubscribe();
    }
  }

  async getAllChannels() {
    const colRef = collection(this.firestore, 'channels');
    this.channelsUnsubscribe = onSnapshot(colRef, (snapshot) => {
      this.allChannels = snapshot.docs.map(doc => new Channel(doc.data()));
      this.findWelcomeChannel();
    });
  }

  async getUserById(userId: string) {
    const userDocref = doc(this.firestore, 'users', userId);
    const userDoc = await getDoc(userDocref);
    if (userDoc.exists()) {
      this.global.currentUserData = {
        id: userDoc.id,
        ...userDoc.data(),
      };
    }
  }

  async getAllUsers() {
    const usersCollection = collection(this.firestore, 'users');
    onSnapshot(usersCollection, (snapshot) => {
      this.allUsers = [];
      snapshot.forEach((doc) => {
        this.checkUsersExsists = true;
        if (doc.id !== this.userId) {
          this.allUsers.push({ id: doc.id, ...doc.data() });
        }
      });
    });
  }

  selectChannel(channel: any) {
    this.selectedChannel = channel;
    this.channelSelected.emit(channel);
    this.global.channelSelected = true;
    this.global.setCurrentChannel(channel);
  }

  toggleChannelDrawer() {
    this.channelDrawerOpen = !this.channelDrawerOpen;
  }
  toggleMessageDrawer() {
    this.messageDrawerOpen = !this.messageDrawerOpen;
  }
}
