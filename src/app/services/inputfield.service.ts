import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InputfieldService {
  private activeComponentId = new BehaviorSubject<string>('');
  activeComponentId$ = this.activeComponentId.asObservable();

  private selectFiles = new BehaviorSubject<any[]>([]);
  selectFiles$ = this.selectFiles.asObservable();

  private filesByComponent: { [key: string]: any[] } = {};
  private filesSubject = new BehaviorSubject<{ [key: string]: any[] }>({});
  files$ = this.filesSubject.asObservable();

  setActiveComponent(id: string): void {
    if (this.activeComponentId.getValue() !== id) {
      this.activeComponentId.next(id);
    } else {
      return;
    }
  }

  updateFiles(componentId: string, files: any[]): void {
    this.filesByComponent[componentId] = files;
    this.filesSubject.next({ ...this.filesByComponent });
    if (componentId === this.activeComponentId.getValue()) {
      this.selectFiles.next(files);
    }
  }

  getFiles(componentId: string): any[] {
    const files = this.filesByComponent[componentId] || [];
    return files;
  }
}
