import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartScreenComponent } from './start-screen.component'; // Stelle sicher, dass der Import korrekt ist

describe('StartScreenComponent', () => {
  let component: StartScreenComponent;
  let fixture: ComponentFixture<StartScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StartScreenComponent] // Verwende declarations statt imports
    }).compileComponents();

    fixture = TestBed.createComponent(StartScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
