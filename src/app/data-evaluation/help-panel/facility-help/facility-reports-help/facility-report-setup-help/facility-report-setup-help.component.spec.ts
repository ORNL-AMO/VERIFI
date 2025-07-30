import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportSetupHelpComponent } from './facility-report-setup-help.component';

describe('FacilityReportSetupHelpComponent', () => {
  let component: FacilityReportSetupHelpComponent;
  let fixture: ComponentFixture<FacilityReportSetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportSetupHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportSetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
