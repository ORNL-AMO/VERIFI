import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportSetupComponent } from './facility-report-setup.component';

describe('FacilityReportSetupComponent', () => {
  let component: FacilityReportSetupComponent;
  let fixture: ComponentFixture<FacilityReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
