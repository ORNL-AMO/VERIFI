import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisSummaryTableFilterComponent } from './analysis-summary-table-filter.component';

describe('AnalysisSummaryTableFilterComponent', () => {
  let component: AnalysisSummaryTableFilterComponent;
  let fixture: ComponentFixture<AnalysisSummaryTableFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisSummaryTableFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisSummaryTableFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
