import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalService {
  statusCheck: boolean = false;
  currentUserData: any;
  constructor() {}
}
