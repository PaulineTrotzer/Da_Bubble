import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { LoginAuthService } from '../services/login-auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-welcome-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome-sheet.component.html',
  styleUrl: './welcome-sheet.component.scss',
})
export class WelcomeSheetComponent implements OnInit {
  isGuestAccount = false;
  LogInAuth = inject(LoginAuthService);
  guestLoginStatusSub: Subscription | undefined;

  ngOnInit(): void {
    this.subscribeToGuestLoginStatus();
  }

  subscribeToGuestLoginStatus(): void {
    this.guestLoginStatusSub = this.LogInAuth.isGuestLogin$.subscribe(
      (status) => {
        this.isGuestAccount = status;
      }
    );
  }
}
