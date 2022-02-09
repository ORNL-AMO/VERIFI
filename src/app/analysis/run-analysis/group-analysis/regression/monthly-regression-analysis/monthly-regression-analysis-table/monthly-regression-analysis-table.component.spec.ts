import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyRegressionAnalysisTableComponent } from './monthly-regression-analysis-table.component';

describe('MonthlyRegressionAnalysisTableComponent', () => {
  let component: MonthlyRegressionAnalysisTableComponent;
  let fixture: ComponentFixture<MonthlyRegressionAnalysisTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyRegressionAnalysisTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyRegressionAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
