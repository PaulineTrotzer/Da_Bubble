import { TestBed } from '@angular/core/testing';

import { InputfieldService } from './inputfield.service';

describe('InputfieldService', () => {
  let service: InputfieldService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InputfieldService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
