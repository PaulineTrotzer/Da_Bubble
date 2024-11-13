import { Injectable, inject } from '@angular/core';
import { getAuth, signInWithPopup, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { GoogleAuthProvider } from 'firebase/auth';
import { User } from '../models/user.class';
import {
  Firestore,
  setDoc,
  doc,
  getDoc,
  collection,
  where,
  query,
  getDocs,
  addDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { OverlayStatusService } from './overlay-status.service';
import { GlobalService } from '../global.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  router = inject(Router);
  user: User = new User();
  firestore = inject(Firestore);
  currentUser: any;
  guestUser: User = new User();
  overlayStatusService =inject(OverlayStatusService);
  globalservice =inject(GlobalService);

  constructor() {}

  googleLogIn() {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(async (result) => {
        this.user = new User({
          uid: result.user.uid,
          name: result.user.displayName,
          email: result.user.email,
          picture: result.user.photoURL,
        });
        await this.addGoogleUserToFirestore(this.user);
        this.globalservice.googleAccountLogIn = true;
        this.router.navigate(['/welcome', this.user.uid]);
      })
      .catch((error) => {
        console.error('fehler beim Google log:', error);
      });
  }

  async addGoogleUserToFirestore(user: User) {
    const userRef = doc(this.firestore, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      await setDoc(userRef, user.toJSON());
    } else {
      console.log('Benutzer existiert bereits in der Datenbank.');
    }
  }

  logOut() {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        this.overlayStatusService.setOverlayStatus(false);
        this.router.navigate(['/']);
      })
      .catch((error) => {
        console.error('Fehler beim Abmelden:', error);
      });
  }

/*   async SignGuestIn() {
     const guestEmail = 'guest@account.de'; 
    const guestDocId = await this.findUserByMail(guestEmail); 

    if (guestDocId) {
      const guestRef = doc(this.firestore, 'users', guestDocId);
      await updateDoc(guestRef, {
        status: 'online'
      })
      this.router.navigate(['/welcome', guestDocId]);
    } else {
      this.guestUser = new User({
        uid: this.user.uid,
        name: 'Guest',
        email: guestEmail,
        picture: './assets/img/picture_frame.png',
      });
      const docRef = await this.addUserToFirestore(this.guestUser);
      this.router.navigate(['/welcome', docRef.id]);
    } 
    
  } */

  async findUserByMail(identifier: string) {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('email', '==', identifier)); 
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    } else {
      return null;
    }
  }

  async addUserToFirestore(user: User) {
    const usersCollection = collection(this.firestore, 'users');
    const docRef = await addDoc(usersCollection, user.toJSON());
    return docRef;
  }
}
