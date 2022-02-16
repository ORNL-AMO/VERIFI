import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyFacilityAnalysisComponent } from './monthly-facility-analysis.component';

describe('MonthlyFacilityAnalysisComponent', () => {
  let component: MonthlyFacilityAnalysisComponent;
  let fixture: ComponentFixture<MonthlyFacilityAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyFacilityAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyFacilityAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
