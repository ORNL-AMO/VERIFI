import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyRegressionAnalysisGraphComponent } from './monthly-regression-analysis-graph.component';

describe('MonthlyRegressionAnalysisGraphComponent', () => {
  let component: MonthlyRegressionAnalysisGraphComponent;
  let fixture: ComponentFixture<MonthlyRegressionAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyRegressionAnalysisGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyRegressionAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
