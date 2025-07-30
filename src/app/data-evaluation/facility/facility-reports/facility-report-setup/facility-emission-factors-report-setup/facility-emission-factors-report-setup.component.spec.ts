import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionFactorsReportSetupComponent } from './facility-emission-factors-report-setup.component';

describe('FacilityEmissionFactorsReportSetupComponent', () => {
  let component: FacilityEmissionFactorsReportSetupComponent;
  let fixture: ComponentFixture<FacilityEmissionFactorsReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEmissionFactorsReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionFactorsReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
