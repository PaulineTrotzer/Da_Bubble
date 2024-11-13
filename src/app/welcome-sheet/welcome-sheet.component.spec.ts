import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeSheetComponent } from './welcome-sheet.component';

describe('WelcomeSheetComponent', () => {
  let component: WelcomeSheetComponent;
  let fixture: ComponentFixture<WelcomeSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeSheetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
