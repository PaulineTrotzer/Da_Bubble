import { animate, style, transition, trigger } from '@angular/animations';

export const fadeOutThread = trigger('fadeOutThread', [
  transition(':leave', [
    style({ opacity: 1 }),
    animate('200ms ease', style({ opacity: 0 })),
  ]),
]);
