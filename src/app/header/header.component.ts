import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Firestore } from '@angular/fire/firestore';
import { User } from '../models/user.class';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../services/user.service';
import { DialogHeaderDropdownComponent } from '../dialog-header-dropdown/dialog-header-dropdown.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs';
import { OverlayStatusService } from '../services/overlay-status.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    DialogHeaderDropdownComponent,
    MatMenuModule,
    MatButtonModule,
    CommonModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  firestore = inject(Firestore);
  user: User = new User();
  userID: any;
  userservice = inject(UserService);
  clicked = false;
  allUsers: User[] = [];
  unsub?: () => void;
  overlayStatusService = inject(OverlayStatusService);
  overlayOpen = false;
  private overlayStatusSub!: Subscription;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.userID = paramMap.get('id');
      if (this.userID) {
        const userResult = await this.userservice.getUser(this.userID);
        if (userResult) {
          this.user = userResult;
          this.userservice.observingUserChanges(
            this.userID,
            (updatedUser: User) => {
              this.user = updatedUser;
            }
          );
        }
      }
    });
    this.subscribeOverlayService();
  }

  subscribeOverlayService(){
    this.overlayStatusSub = this.overlayStatusService.overlayStatus$.subscribe(
      (status) => {
        this.overlayOpen = status;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.unsub) {
      this.unsub();
    }
    if (this.overlayStatusSub) {
      this.overlayStatusSub.unsubscribe();
    }
  }

  toggleDropDown() {
    this.clicked = !this.clicked;
    this.overlayStatusService.setOverlayStatus(this.clicked);
  }

  closeDropDown() {
    this.overlayStatusService.setOverlayStatus(false);
  }
}
