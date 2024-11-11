import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileContactCardComponent } from './profile-contact-card.component';

describe('ProfileContactCardComponent', () => {
  let component: ProfileContactCardComponent;
  let fixture: ComponentFixture<ProfileContactCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileContactCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileContactCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
