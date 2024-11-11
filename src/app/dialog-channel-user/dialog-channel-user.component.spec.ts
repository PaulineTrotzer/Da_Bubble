import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogChannelUserComponent } from './dialog-channel-user.component';

describe('DialogChannelUserComponent', () => {
  let component: DialogChannelUserComponent;
  let fixture: ComponentFixture<DialogChannelUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogChannelUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogChannelUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
