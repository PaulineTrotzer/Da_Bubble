import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { User } from '../models/user.class';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from '@angular/fire/auth';
import { MatCardModule, MatCardContent } from '@angular/material/card';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    RouterModule,
    MatCardModule,
  ],
  templateUrl: './create-account.component.html',
  styleUrl: './create-account.component.scss',
})
export class CreateAccountComponent implements OnInit {
  linkAlreadySended = false;
  isHovered: boolean = false;
  isClicked: boolean = false;
  isChecked: boolean = false;
  firestore: Firestore = inject(Firestore);
  router: Router = inject(Router);
  auth = getAuth();
  userData = {
    name: '',
    email: '',
    password: '',
    privacyPolicy: false,
  };
  newUser: User = new User();
  linkWasSend = false;
  global = inject(GlobalVariableService);
  userError = false;
  userLoggedIn = localStorage.getItem('userLoggedIn');

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {}

  onSubmit(ngForm: NgForm) {
    if (ngForm.submitted && ngForm.form.valid) {
      this.createAuthUser(this.userData.email, this.userData.password);
    }
  }

  async createAuthUser(email: string, password: string) {
    debugger;
    if (this.userLoggedIn && this.userLoggedIn === email.trim().toLowerCase()) {
      this.userError = true;
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      const authUser = userCredential.user;
      this.newUser = new User({
        uid: authUser.uid,
        name: this.userData.name,
        email: authUser.email || email,
        picture: '',
        password: '',
        status: 'offline',
      });
      this.openLinkSend();
      await sendEmailVerification(authUser);
      await this.addUserToFirestore(this.newUser);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.linkAlreadySended = true;
      } else {
        console.error('Fehler beim Erstellen des Benutzers:', error);
      }
    }
  }

  async addUserToFirestore(user: User) {
    try {
      const userDocRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userDocRef, user.toJSON());
      console.log('Benutzer in Firestore hinzugefügt mit UID:', user.uid);
      return userDocRef;
    } catch (error) {
      console.error('Error adding user to Firestore:', error);
      throw error;
    }
  }

  toggleClicked() {
    this.isClicked = !this.isClicked;
  }

  toggleChecked() {
    this.isChecked = !this.isChecked;
    this.userData.privacyPolicy = this.isChecked;
  }

  toggleHover() {
    this.isHovered = !this.isHovered;
  }

  openLinkSend() {
    this.linkWasSend = true;
    setTimeout(() => {
      this.linkWasSend = false;
    }, 1500);
  }

  resetUserError() {
    this.linkAlreadySended = false;
    this.userError = false;
  }
}
