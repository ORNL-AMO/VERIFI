import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAnalysisSummaryTableFilterComponent } from './monthly-analysis-summary-table-filter.component';

describe('MonthlyAnalysisSummaryTableFilterComponent', () => {
  let component: MonthlyAnalysisSummaryTableFilterComponent;
  let fixture: ComponentFixture<MonthlyAnalysisSummaryTableFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAnalysisSummaryTableFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAnalysisSummaryTableFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
