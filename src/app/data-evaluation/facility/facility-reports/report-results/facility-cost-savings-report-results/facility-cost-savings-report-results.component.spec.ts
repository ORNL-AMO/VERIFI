import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCostSavingsReportResultsComponent } from './facility-cost-savings-report-results.component';

describe('FacilityCostSavingsReportResultsComponent', () => {
  let component: FacilityCostSavingsReportResultsComponent;
  let fixture: ComponentFixture<FacilityCostSavingsReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityCostSavingsReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCostSavingsReportResultsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
