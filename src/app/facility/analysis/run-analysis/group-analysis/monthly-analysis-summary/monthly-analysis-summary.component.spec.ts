import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAnalysisSummaryComponent } from './monthly-analysis-summary.component';

describe('MonthlyAnalysisSummaryComponent', () => {
  let component: MonthlyAnalysisSummaryComponent;
  let fixture: ComponentFixture<MonthlyAnalysisSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAnalysisSummaryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAnalysisSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
