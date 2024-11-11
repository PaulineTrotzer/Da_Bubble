import { Component, inject, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { DialogHeaderProfilCardComponent } from '../dialog-header-profil-card/dialog-header-profil-card.component';
import { doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-dialog-header-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    DialogHeaderProfilCardComponent,
  ],
  templateUrl: './dialog-header-dropdown.component.html',
  styleUrl: './dialog-header-dropdown.component.scss',
})
export class DialogHeaderDropdownComponent {
  authService = inject(AuthService);
  firestore = inject(Firestore);
  route = inject(ActivatedRoute);
  wasClicked = false;
  showDropDownOptions = true;
  userId: any;

  openProfile() {
    this.wasClicked = true;
    this.showDropDownOptions = false;
  }

  logOut() {
    this.authService.logOut();
    this.updateStatus(this.userId);
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
  }

  async updateStatus(userId: string) {
    const docRef = doc(this.firestore, 'users', userId);
    await updateDoc(docRef, {
      status: 'offline',
    });
  }
}
