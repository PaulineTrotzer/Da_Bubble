import {
  Component,
  inject,
  OnChanges,
  OnInit,
  EventEmitter,
  Output,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Firestore, collection, onSnapshot } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-people-mention',
  standalone: true,
  imports: [MatCardModule, CommonModule, FormsModule],
  templateUrl: './people-mention.component.html',
  styleUrl: './people-mention.component.scss',
})
export class PeopleMentionComponent implements OnInit, OnChanges {
  firestore = inject(Firestore);
  allUsers: any[] = [];
  searchUserName: string = '';
  noUserFound: boolean = false;
  @Output() cardClosed = new EventEmitter<void>();
  @Output() mentionUser = new EventEmitter<string>();

  constructor(public global: GlobalVariableService) {}

  async ngOnInit(): Promise<void> {
    await this.getAllUsers();
  }

  ngOnChanges(): void {
    this.getFilteredUsers();
  }

  cancelCard() {
    this.cardClosed.emit();
  }

  async getAllUsers() {
    debugger;
    const usersRef = collection(this.firestore, 'users');
    onSnapshot(usersRef, (querySnapshot) => {
      this.allUsers = [];
      querySnapshot.forEach((docSnap) => {
        if (docSnap.id !== this.global.currentUserData.id) {
          const dataUser = docSnap.data();
          if (dataUser['name'] !== 'Guest') {
            this.allUsers.push({ id: docSnap.id, ...dataUser });
          }
        }
      });
    });
  }

  getFilteredUsers() {
    if (!this.searchUserName.trim()) {
      this.noUserFound = false;
      return this.allUsers.filter((user) => user.name !== 'Gast');
    }
    const filteredUsers = this.allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(this.searchUserName.toLowerCase()) &&
        user.name !== 'Gast'
    );

    this.noUserFound = filteredUsers.length === 0;
    return filteredUsers;
  }

  selectUser(user: any) {
    const mention = user.username;
    this.mentionUser.emit(mention);
    this.global.openMentionPeopleCard = false;
  }
}
