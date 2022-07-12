import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScorecardStatusComponent } from './scorecard-status.component';

describe('ScorecardStatusComponent', () => {
  let component: ScorecardStatusComponent;
  let fixture: ComponentFixture<ScorecardStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScorecardStatusComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ScorecardStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
