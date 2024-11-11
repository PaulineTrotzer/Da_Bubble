import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogHeaderDropdownComponent } from './dialog-header-dropdown.component';

describe('DialogHeaderDropdownComponent', () => {
  let component: DialogHeaderDropdownComponent;
  let fixture: ComponentFixture<DialogHeaderDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogHeaderDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogHeaderDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
