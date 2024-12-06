import { trigger, transition, style, animate } from '@angular/animations';

export const slideFromRight = trigger('slideFromRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(50%)' }),
    animate('125ms ease-in-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    animate('125ms ease-in-out', style({ opacity: 0, transform: 'translateX(50%)' })),
  ]),
]);

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('125ms ease-in-out', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('125ms ease-in-out', style({ opacity: 0 })),
  ]),
]);
