import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyRegressionAnalysisComponent } from './monthly-regression-analysis.component';

describe('MonthlyRegressionAnalysisComponent', () => {
  let component: MonthlyRegressionAnalysisComponent;
  let fixture: ComponentFixture<MonthlyRegressionAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyRegressionAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyRegressionAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
