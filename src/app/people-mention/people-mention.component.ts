import { Component, inject, OnChanges, OnInit, EventEmitter, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Firestore, collection, onSnapshot, query, where, doc, updateDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalVariableService } from '../services/global-variable.service';


@Component({
  selector: 'app-people-mention',
  standalone: true,
  imports: [MatCardModule, CommonModule, FormsModule],
  templateUrl: './people-mention.component.html',
  styleUrl: './people-mention.component.scss'
})
export class PeopleMentionComponent implements OnInit, OnChanges {

  constructor(public global: GlobalVariableService) { }

  firestore = inject(Firestore);
  allUsers: any[] = []
  searchUserName: string = '';

  ngOnInit(): void {
    this.getAllUsers()
  }

  ngOnChanges(): void {
    this.getFilteredUsers()
  }

  cancelCard() {
    this.global.openMentionPeopleCard = false
  }


  getAllUsers() {
    const usersRef = collection(this.firestore, 'users');
    onSnapshot(usersRef, (querySnapshot) => {
      this.allUsers = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== this.global.currentUserData.id) {
          const dataUser = doc.data();
          if (dataUser['name'] !== 'Guest') {
            this.allUsers.push({ id: doc.id, ...dataUser });
          }
        }
      });
      console.log(this.allUsers);
    });
  }

  noUserFound: boolean = false;

  getFilteredUsers() {
    if (!this.searchUserName.trim()) {
      this.noUserFound = false;
      return this.allUsers;
    }
    const filteredUsers = this.allUsers.filter((user) =>
      user.name.toLowerCase().includes(this.searchUserName.toLowerCase())
    );
    this.noUserFound = filteredUsers.length === 0;
    return filteredUsers;
  }



  @Output() mentionUser = new EventEmitter<string>();

  selectUser(user: any) { 
    const mention =  user.name;
    this.mentionUser.emit(mention);
    // console.log( this.mentionUser);
    this.global.openMentionPeopleCard=false;
  }
  
}
