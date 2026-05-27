import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCostSavingsReportSetupComponent } from './facility-cost-savings-report-setup.component';

describe('FacilityCostSavingsReportSetupComponent', () => {
  let component: FacilityCostSavingsReportSetupComponent;
  let fixture: ComponentFixture<FacilityCostSavingsReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityCostSavingsReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCostSavingsReportSetupComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
