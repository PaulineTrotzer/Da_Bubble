import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [MatCardModule, CommonModule],
  templateUrl: './impressum.component.html',
  styleUrl: './impressum.component.scss',
})
export class ImpressumComponent {
  router = inject(Router);

  constructor(private location: Location) {}

  goBack() {
    this.location.back();
  }
}
