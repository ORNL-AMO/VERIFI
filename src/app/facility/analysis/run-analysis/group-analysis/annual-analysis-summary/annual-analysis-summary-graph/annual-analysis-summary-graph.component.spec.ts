import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualAnalysisSummaryGraphComponent } from './annual-analysis-summary-graph.component';

describe('AnnualAnalysisSummaryGraphComponent', () => {
  let component: AnnualAnalysisSummaryGraphComponent;
  let fixture: ComponentFixture<AnnualAnalysisSummaryGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualAnalysisSummaryGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualAnalysisSummaryGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
