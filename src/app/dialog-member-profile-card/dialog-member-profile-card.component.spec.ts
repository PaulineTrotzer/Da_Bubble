import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMemberProfileCardComponent } from './dialog-member-profile-card.component';

describe('DialogMemberProfileCardComponent', () => {
  let component: DialogMemberProfileCardComponent;
  let fixture: ComponentFixture<DialogMemberProfileCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogMemberProfileCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogMemberProfileCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
