import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualAnalysisSummaryComponent } from './annual-analysis-summary.component';

describe('AnnualAnalysisSummaryComponent', () => {
  let component: AnnualAnalysisSummaryComponent;
  let fixture: ComponentFixture<AnnualAnalysisSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualAnalysisSummaryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualAnalysisSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
