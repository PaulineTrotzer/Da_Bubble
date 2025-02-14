import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-intro-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro-animation.component.html',
  styleUrl: './intro-animation.component.scss',
})
export class IntroAnimationComponent {
  flyUpActive = false;

  ngOnInit() {
    setTimeout(() => {
      this.flyUpActive = true;
    }, 1000);
  }
}
