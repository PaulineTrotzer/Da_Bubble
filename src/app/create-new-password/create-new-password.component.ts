import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  getAuth,
  confirmPasswordReset,
  applyActionCode,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { checkActionCode } from '@angular/fire/auth';

@Component({
  selector: 'app-create-new-password',
  standalone: true,
  imports: [FormsModule, MatCardModule, RouterModule, CommonModule],
  templateUrl: './create-new-password.component.html',
  styleUrl: './create-new-password.component.scss',
})
export class CreateNewPasswordComponent {
  sendInfo: boolean = false;
  disabled: boolean = true;
  route = inject(ActivatedRoute);
  checkPasswordinfo: boolean = false;
  password: string = '';
  confirmPassword: string = '';
  oobCode: any;
  mode: any;
  firestore = inject(Firestore);
  router = inject(Router);
  userDocument: any = {};
  passwordTooShort: boolean = false;

  constructor(public global: GlobalVariableService) {}

  openDiv() {
    setTimeout(() => {
      this.sendInfo = false;
    }, 2000);
  }

  resetFields(): void {
    this.confirmPassword = '';
    this.password = '';
  }


  
  ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      this.oobCode = params['oobCode'];
      this.mode = params['mode'];
      if (this.mode === 'verifyEmail' && this.oobCode) {
        const auth = getAuth();
        try {
          const info = await checkActionCode(auth, this.oobCode);
          // Normalisiere die E-Mail: trim und in Kleinbuchstaben
          const emailRaw = info.data.email;
          if (!emailRaw) {
            throw new Error('Keine Email im Action Code gefunden');
          }

          
          const email = emailRaw.trim().toLowerCase();
          // Debug: Kannst du auch temporär Alerts einsetzen, falls du kein Debugging via Remote nutzen kannst:
          alert('E-Mail aus checkActionCode: ' + email);
  
          const q = query(
            collection(this.firestore, 'users'),
            where('email', '==', email)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            this.userDocument = { id: snap.docs[0].id, ...snap.docs[0].data() };
            this.global.verifyEmail = true;
          } else {
            alert('Kein Benutzer gefunden für E-Mail: ' + email);
          }
        } catch (error) {
          console.error('Fehler beim Abrufen des Action Codes:', error);
          alert('Fehler beim Abrufen des Action Codes: ');
        }
      }
    });
  }
  
  
  

  async fetchUserDocument() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.getUserDoc(user.uid);
      }
    });
  }

  async getUserDoc(uid: string) {
    const userDocRef = doc(this.firestore, 'users', uid);
    const getDocRef = await getDoc(userDocRef);
    if (getDocRef.exists()) {
      this.userDocument = { id: getDocRef.id, ...getDocRef.data() };
    }
  }

  checkPasswordFields() {
    this.passwordTooShort =
      this.password.length > 0 && this.password.length < 7;
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
    const auth = getAuth();
    if (!this.oobCode) return;
  
    try {
      await applyActionCode(auth, this.oobCode);
      this.global.verifyEmail = true;
  
      // Nutze die UID aus dem bereits geladenen userDocument, falls vorhanden
      if (this.userDocument && this.userDocument.id) {
        const userRef = doc(this.firestore, 'users', this.userDocument.id);
        await updateDoc(userRef, { emailVerified: true });
        this.sendInfo = true;
        this.openDiv();
        setTimeout(() => this.router.navigate(['/avatar', this.userDocument.id]), 1500);
      } else {
        alert('Kein User-Dokument gefunden.');
      }
    } catch (error) {
      console.error('Fehler bei der E-Mail‑Bestätigung:', error);
      alert('Fehler bei der E-Mail‑Bestätigung: ' );
    }
  }
  
}
