import { trigger, transition, style, animate } from '@angular/animations';

export const slideInAnimation = trigger('slideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-50%)' }),
    animate('150ms ease-in-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    style({ opacity: 1, transform: 'translateX(0)' }),
    animate('150ms ease-in-out', style({ opacity: 0, transform: 'translateX(-50%)' })),
  ]),
]);
