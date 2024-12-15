import {
  Firestore,
  Unsubscribe,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc
} from '@angular/fire/firestore';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DialogCreateChannelComponent } from '../dialog-create-channel/dialog-create-channel.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { UserService } from '../services/user.service';
import { User } from '../models/user.class';
import { Channel } from '../models/channel.class';
import { LoginAuthService } from '../services/login-auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    DialogCreateChannelComponent],
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
  logInAuth=inject(LoginAuthService);
  isGuestLogin = false;
  private guestLoginStatusSub: Subscription | undefined;
  clickedUsers: string[] = []; 
  id:any;
  selectedUsers: any[] = []; 
  messageCountsArr:any={};

  constructor(public global: GlobalVariableService) {}

  async ngOnInit(): Promise<void> {
    this.getAllUsers();
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.getUserById(this.userId);
      this.getUserMessageCount(this.userId);
      this.userService.observingUserChanges(
        this.userId,
        (updatedUser: User) => {
          this.global.currentUserData.name = updatedUser.name;
        }
      );
    }
    this.subscribeToGuestLoginStatus();
    await this.getAllChannels(); 
     
  }

  subscribeToGuestLoginStatus(): void {
    this.guestLoginStatusSub = this.logInAuth.isGuestLogin$.subscribe(
      (status) => {
        this.isGuestLogin = status;
      }
    );
  } 

 


selectUser(user: any) {
  this.userSelected.emit(user);
  this.id = user.id;
  this.global.currentThreadMessageSubject.next('');
  this.global.channelThreadSubject.next(null);
  const actuallyId = this.id;
  if (this.userId && this.messageCountsArr?.messageCount && this.messageCountsArr.messageCount[actuallyId] > 0) {
    const docRef = doc(this.firestore, 'messageCounts', this.userId);
    const resetMessageCount: any = {};
    resetMessageCount[`messageCount.${actuallyId}`] = 0;
    updateDoc(docRef, resetMessageCount);
  }     
}   

 




// async updateRoomStatus(userId: string, status: boolean) {
//   const currentUserDocRef = doc(this.firestore, 'roomStatus', this.userId);
//   await setDoc(currentUserDocRef, { isInRoom: status },{ merge: true });
//   const clickedUserDocRef = doc(this.firestore, 'roomStatus', userId);
//   await setDoc(clickedUserDocRef, { isInRoom: status },{ merge: true });
// }
  


           
  selectCurrentUser() {
    this.userSelected.emit(this.global.currentUserData);
    this.global.statusCheck = true;
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

  findWelcomeChannel() {
    const willkommenChannel = this.allChannels.find(
      (channel) => channel.name == 'Willkommen'
    );
    if (willkommenChannel) {
      this.global.channelSelected=false;
      this.selectChannel(willkommenChannel);
      console.log(this.global.channelSelected=false)
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
      this.allChannels = snapshot.docs.map((doc) => new Channel(doc.data()));
      this.sortChannels();
      this.findWelcomeChannel();
    });
  }

  sortChannels() {
    this.allChannels.sort((a, b) => {
      if (a.name === 'Willkommen') return -1;
      if (b.name === 'Willkommen') return 1;
      return 0; 
    });
  }

  async getUserById(userId: string) {
    const userDocref = doc(this.firestore, 'users', userId);
    onSnapshot(userDocref,(docSnapshot)=>{
      if (docSnapshot.exists()) {
        const data=docSnapshot.data();
        const id = docSnapshot.id
        this.global.currentUserData ={id:id,...data};
      }else{
        this.global.currentUserData={};
      }
    })
  }
    
    

   getUserMessageCount(userId:string){
    const userDocRef=doc(this.firestore,'messageCounts',userId)
     onSnapshot(userDocRef,(snapshot)=>{
       if(snapshot.exists()){ 
          this.messageCountsArr={...snapshot.data()}
       }else{
        this.messageCountsArr={};
       }
     })
   }  
   

  async getAllUsers() {
    const usersCollection = collection(this.firestore, 'users');
    onSnapshot(usersCollection, (snapshot) => {
      this.allUsers = [];
      snapshot.forEach((doc) => {
        this.checkUsersExsists = true;
        if (doc.id !== this.userId) {
          this.allUsers.push({ id: doc.id, ...doc.data()});
        }
      });
    });
  }


  selectChannel(channel: any) {  
      this.selectedChannel = channel;
      this.global.channelSelected=true;
      this.channelSelected.emit(channel);
      this.global.currentThreadMessageSubject.next('');
      this.global.channelThreadSubject.next(null);
      this.global.setCurrentChannel(channel);
  }  

    
      
  toggleChannelDrawer() {
    this.channelDrawerOpen = !this.channelDrawerOpen;
  }
  toggleMessageDrawer() {
    this.messageDrawerOpen = !this.messageDrawerOpen;
  }
}