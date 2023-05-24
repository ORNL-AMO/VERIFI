import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAnalysisSummarySavingsGraphComponent } from './monthly-analysis-summary-savings-graph.component';

describe('MonthlyAnalysisSummarySavingsGraphComponent', () => {
  let component: MonthlyAnalysisSummarySavingsGraphComponent;
  let fixture: ComponentFixture<MonthlyAnalysisSummarySavingsGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAnalysisSummarySavingsGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyAnalysisSummarySavingsGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
