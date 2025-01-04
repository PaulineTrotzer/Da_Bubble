import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { getAuth, confirmPasswordReset, applyActionCode, onAuthStateChanged } from "firebase/auth";
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-create-new-password',
  standalone: true,
  imports: [FormsModule, MatCardModule, RouterModule, CommonModule],
  templateUrl: './create-new-password.component.html',
  styleUrl: './create-new-password.component.scss'
})
export class CreateNewPasswordComponent {
  constructor(public global: GlobalVariableService) { }


  sendInfo: boolean = false;
  disabled: boolean = true;
  route = inject(ActivatedRoute);
  checkPasswordinfo: boolean = false;
  password: string = '';
  confirmPassword: string = '';
  oobCode: any;
  mode: any
  firestore = inject(Firestore);
  router = inject(Router);

  openDiv() {
    setTimeout(() => {
      this.sendInfo = false;
    }, 2000);
  }

  resetFields(): void {
    this.confirmPassword = '';
    this.password = ''
  }

  ngOnInit() {
    debugger;
    this.route.queryParams.subscribe(params => {
      this.oobCode = params['oobCode'];
      this.mode = params['mode'];
      if (this.oobCode && this.mode === 'resetPassword') {
        console.log('Ok')
        this.global.createNewPassword = true;
        this.global.verifyEmail = false;
      } else if (this.oobCode && this.mode === 'verifyEmail') {
        this.global.verifyEmail = true;
        this.global.createNewPassword = false;
      }
    });
    this.fetchUserDocument();
  }

  userDocument: any = {};

  async fetchUserDocument() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.getUserDoc(user.uid);
      }
    })
  }


  async getUserDoc(uid: string) {
    const userDocRef = doc(this.firestore, 'users', uid);
    const getDocRef = await getDoc(userDocRef);
    if (getDocRef.exists()) {
      this.userDocument = { id: getDocRef.id, ...getDocRef.data() };
      console.log('User Document:', this.userDocument);
    }
  }

  checkPasswordFields() {
    if (this.password && this.confirmPassword) {
      this.disabled = false; 
      this.checkPasswordinfo = false; 
    } else {
      this.disabled = true; 
    }
  }

  async createNewPassword() {
    if (this.password !== this.confirmPassword) {
      this.checkPasswordinfo = true; 
      return;
    }
    const auth = getAuth();
    if (!this.oobCode) {
      return;
    }
    await confirmPasswordReset(auth, this.oobCode, this.password);
    const user = auth.currentUser;
    if (user) {
      const userUID = user.uid;
    }
    this.resetFields();
    this.sendInfo = true;
    this.openDiv();
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1500);
  }
  
  
  async verifyEmail() {
    debugger;
    const auth = getAuth();
    if (!this.oobCode) {
      return;
    }else{
      await applyActionCode(auth, this.oobCode);
      this.global.verifyEmail = true;
      const currentUser = auth.currentUser;
      if (currentUser) {
        const uid = currentUser.uid;
        this.sendInfo=true;
        this.openDiv();
        setTimeout(() => {
          this.router.navigate(['/avatar', uid]);
        }, 1500);
      }
    }
  }
}
