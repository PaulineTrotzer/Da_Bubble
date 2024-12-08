import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirstMessageThreadComponent } from './first-message-thread.component';

describe('FirstMessageThreadComponent', () => {
  let component: FirstMessageThreadComponent;
  let fixture: ComponentFixture<FirstMessageThreadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstMessageThreadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FirstMessageThreadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
