import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogHeaderProfilCardComponent } from './dialog-header-profil-card.component';

describe('DialogHeaderProfilCardComponent', () => {
  let component: DialogHeaderProfilCardComponent;
  let fixture: ComponentFixture<DialogHeaderProfilCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogHeaderProfilCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogHeaderProfilCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
