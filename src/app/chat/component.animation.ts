import { trigger, transition, style, animate } from '@angular/animations';

export const fadeInOutAnimation = trigger('fadeInOut', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-10px)' }),
    animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    animate(
      '300ms ease',
      style({ opacity: 0, transform: 'translateY(-10px)' })
    ),
  ]),
]);
