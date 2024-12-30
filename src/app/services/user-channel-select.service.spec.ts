import { TestBed } from '@angular/core/testing';

import { UserChannelSelectService } from './user-channel-select.service';

describe('UserChannelSelectService', () => {
  let service: UserChannelSelectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserChannelSelectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
