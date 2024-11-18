import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentionMessageBoxComponent } from './mention-message-box.component';

describe('MentionMessageBoxComponent', () => {
  let component: MentionMessageBoxComponent;
  let fixture: ComponentFixture<MentionMessageBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionMessageBoxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentionMessageBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
