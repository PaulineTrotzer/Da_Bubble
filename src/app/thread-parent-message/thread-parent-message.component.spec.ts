import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreadParentMessageComponent } from './thread-parent-message.component';

describe('ThreadParentMessageComponent', () => {
  let component: ThreadParentMessageComponent;
  let fixture: ComponentFixture<ThreadParentMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadParentMessageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreadParentMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
