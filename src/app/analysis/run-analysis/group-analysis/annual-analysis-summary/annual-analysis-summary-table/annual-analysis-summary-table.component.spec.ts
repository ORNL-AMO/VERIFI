import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualAnalysisSummaryTableComponent } from './annual-analysis-summary-table.component';

describe('AnnualAnalysisSummaryTableComponent', () => {
  let component: AnnualAnalysisSummaryTableComponent;
  let fixture: ComponentFixture<AnnualAnalysisSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualAnalysisSummaryTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualAnalysisSummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
