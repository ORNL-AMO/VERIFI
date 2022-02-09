import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAnalysisSummaryTableComponent } from './monthly-analysis-summary-table.component';

describe('MonthlyAnalysisSummaryTableComponent', () => {
  let component: MonthlyAnalysisSummaryTableComponent;
  let fixture: ComponentFixture<MonthlyAnalysisSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAnalysisSummaryTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAnalysisSummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
