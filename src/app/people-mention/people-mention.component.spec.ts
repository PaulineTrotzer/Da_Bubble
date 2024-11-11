import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeopleMentionComponent } from './people-mention.component';

describe('PeopleMentionComponent', () => {
  let component: PeopleMentionComponent;
  let fixture: ComponentFixture<PeopleMentionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeopleMentionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeopleMentionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
