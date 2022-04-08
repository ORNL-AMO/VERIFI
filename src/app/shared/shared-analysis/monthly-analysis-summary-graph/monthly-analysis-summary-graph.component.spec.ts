import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAnalysisSummaryGraphComponent } from './monthly-analysis-summary-graph.component';

describe('MonthlyAnalysisSummaryGraphComponent', () => {
  let component: MonthlyAnalysisSummaryGraphComponent;
  let fixture: ComponentFixture<MonthlyAnalysisSummaryGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAnalysisSummaryGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAnalysisSummaryGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
