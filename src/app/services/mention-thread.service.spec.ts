import { TestBed } from '@angular/core/testing';

import { MentionThreadService } from './mention-thread.service';

describe('MentionThreadService', () => {
  let service: MentionThreadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MentionThreadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
