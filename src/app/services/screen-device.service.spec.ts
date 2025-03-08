import { TestBed } from '@angular/core/testing';

import { ScreenDeviceService } from './screen-device.service';

describe('ScreenDeviceService', () => {
  let service: ScreenDeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScreenDeviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
