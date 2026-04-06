import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityModelingReportSetupComponent } from './facility-modeling-report-setup.component';

describe('FacilityModelingReportSetupComponent', () => {
  let component: FacilityModelingReportSetupComponent;
  let fixture: ComponentFixture<FacilityModelingReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityModelingReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityModelingReportSetupComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
