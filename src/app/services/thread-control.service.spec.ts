import { TestBed } from '@angular/core/testing';

import { ThreadControlService } from './thread-control.service';

describe('ThreadControlService', () => {
  let service: ThreadControlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThreadControlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
