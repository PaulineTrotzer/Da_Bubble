import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  QuerySnapshot,
  DocumentData,
  docData,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { OverlayStatusService } from './overlay-status.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private currentUser: string | null = null;
  private selectedUserSubject = new BehaviorSubject<User | null>(null);
  selectedUser$ = this.selectedUserSubject.asObservable();

  private profileSelectionSubject = new BehaviorSubject<string | null>(null); 
  profileSelection$ = this.profileSelectionSubject.asObservable();

  user: User = new User();
  uid: any;
  unsub?: () => void;
  overlayStatusService = inject(OverlayStatusService);

  constructor(private firestore: Firestore) {}

  setCurrentUser(uid: string) {
    this.currentUser = uid;
  }

  getCurrentUser(): string | null {
    return this.currentUser;
  }

  async getUser(uid: string) {
    const userRef = doc(this.firestore, 'users', uid);
    await updateDoc(userRef, { uid: uid });
    const userSnapshot = await getDoc(userRef);
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data() as User;
      this.user = userData;
      return this.user;
    } else return null;
  }

  observingUserChanges(uid: string, callback: (user: User) => void) {
    const newUsersRef = collection(this.firestore, 'users');
    this.unsub = onSnapshot(
      newUsersRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        snapshot.forEach((docSnapshot) => {
          const userData = docSnapshot.data();
          const snapID = docSnapshot.id;
          if (snapID === uid) {
            const updatedUser = new User(userData, uid);
            callback(updatedUser);
          }
        });
      }
    );
  }

  getUserAvatar(userId: string): Observable<string> {
    const userRef = doc(this.firestore, 'users', userId);
    return docData(userRef).pipe(
      map((userData: any) => userData?.picture || '') // Gibt die Avatar-URL zurück
    );
  }
  async updateMessagesWithNewPhoto(newPhotoUrl: string, userId: string) {
    if (newPhotoUrl) {
      try {
        // Abrufen der Nachrichten des Benutzers
        const messagesRef = collection(this.firestore, 'messages');
        const q = query(
          messagesRef,
          where('senderId', '==', userId) // Nur Nachrichten des Benutzers
        );
  
        // Alle Nachrichten des Benutzers durchgehen und das Avatar aktualisieren
        const querySnapshot = await getDocs(q);
        for (const doc of querySnapshot.docs) {
          const messageRef = doc.ref;
          await updateDoc(messageRef, {
            photoUrl: newPhotoUrl, // Update des Foto-URLs der Nachricht
          });
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Nachrichten mit neuem Foto:', error);
      }
    }
  }

  setSelectedUser(user: User) {
    this.selectedUserSubject.next(user);
  }

  selectProfile(profileType: string) {
    this.profileSelectionSubject.next(profileType);
    this.overlayStatusService.setOverlayStatus(true);
  }

  resetProfileSelection() {
    this.profileSelectionSubject.next(null);
    this.overlayStatusService.setOverlayStatus(false);
  }
}
