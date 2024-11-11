import { Component, OnInit, inject } from '@angular/core';
import { User } from '../models/user.class';
import {
  Firestore,
  collection,
  DocumentData,
  onSnapshot,
  QuerySnapshot,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
})
export class UserComponent implements OnInit {
  firestore = inject(Firestore);
  unsub?: () => void;
  allUsers: User[] = [];

  ngOnInit(): void {
/*     this.startListeningNewUsers(); */
  }

  ngOnDestroy() {
    if (this.unsub) {
      this.unsub();
    }
  }

/*   startListeningNewUsers() {
    const newUsersRef = collection(this.firestore, 'users');
    this.unsub = onSnapshot(
      newUsersRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const updatedUsers: User[] = [];
        snapshot.forEach((doc) => {
          const userData = doc.data();
          const newUser = new User(userData);
          updatedUsers.push(newUser);
        });
        this.allUsers = updatedUsers;
      }
    );
  } */
}
