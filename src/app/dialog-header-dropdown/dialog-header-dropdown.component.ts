import { Component, inject, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';
import { DialogHeaderProfilCardComponent } from '../dialog-header-profil-card/dialog-header-profil-card.component';
import { doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { ActivatedRoute } from '@angular/router';
import { OverlayStatusService } from '../services/overlay-status.service';


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
export class DialogHeaderDropdownComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  firestore = inject(Firestore);
  route = inject(ActivatedRoute);
  wasClicked = false;
  showDropDownOptions = true;
  userId: any;
  overlayStatusService = inject(OverlayStatusService); 


  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    document.addEventListener('click', this.handleClickOutside);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClickOutside);
  }

  openProfile(): void {
    this.wasClicked = true;
    this.showDropDownOptions = false;
  }

  logOut() {
    this.authService.logOut();
    this.updateStatus(this.userId);
  }
  handleClickOutside = (event: MouseEvent) => {
    const dropdown = document.querySelector('.dialog-ct');
    if (dropdown && !dropdown.contains(event.target as Node)) {
      this.showDropDownOptions = false; 
      this.overlayStatusService.setOverlayStatus(false);
    }
  };


  async updateStatus(userId: string) {
    const docRef = doc(this.firestore, 'users', userId);
    await updateDoc(docRef, {
      status: 'offline',
    });
  }
}
