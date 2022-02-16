import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyFacilityAnalysisTableComponent } from './monthly-facility-analysis-table.component';

describe('MonthlyFacilityAnalysisTableComponent', () => {
  let component: MonthlyFacilityAnalysisTableComponent;
  let fixture: ComponentFixture<MonthlyFacilityAnalysisTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyFacilityAnalysisTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyFacilityAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
