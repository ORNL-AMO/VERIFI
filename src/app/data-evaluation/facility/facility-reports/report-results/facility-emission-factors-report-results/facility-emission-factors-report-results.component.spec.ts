import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionFactorsReportResultsComponent } from './facility-emission-factors-report-results.component';

describe('FacilityEmissionFactorsReportResultsComponent', () => {
  let component: FacilityEmissionFactorsReportResultsComponent;
  let fixture: ComponentFixture<FacilityEmissionFactorsReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEmissionFactorsReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionFactorsReportResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
