import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportingSetupComponent } from './facility-reporting-setup.component';

describe('FacilityReportingSetupComponent', () => {
  let component: FacilityReportingSetupComponent;
  let fixture: ComponentFixture<FacilityReportingSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityReportingSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportingSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
