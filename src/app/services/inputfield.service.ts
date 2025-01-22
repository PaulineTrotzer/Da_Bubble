import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InputfieldService {
  private activeComponentId = new BehaviorSubject<string>(''); // Keine Standard-ID
  activeComponentId$ = this.activeComponentId.asObservable();

  private selectFiles = new BehaviorSubject<any[]>([]);
  selectFiles$ = this.selectFiles.asObservable();

  private filesByComponent: { [key: string]: any[] } = {};
  private filesSubject = new BehaviorSubject<{ [key: string]: any[] }>({});
  files$ = this.filesSubject.asObservable();

  setActiveComponent(id: string): void {
    console.log('Attempting to set active component to:', id);
    if (this.activeComponentId.getValue() !== id) {
      this.activeComponentId.next(id);
      console.log('Active component updated to:', id);
    } else {
      console.log('Active component remains unchanged:', id);
    }
  }

  updateFiles(componentId: string, files: any[]): void {
    this.filesByComponent[componentId] = files;
    this.filesSubject.next(this.filesByComponent); // Aktualisiere den globalen Zustand
  }

  getFiles(componentId: string): any[] {
    return this.filesByComponent[componentId] || [];
  }
}
