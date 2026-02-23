import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityModelingReportResultsComponent } from './facility-modeling-report-results.component';

describe('FacilityModelingReportResultsComponent', () => {
  let component: FacilityModelingReportResultsComponent;
  let fixture: ComponentFixture<FacilityModelingReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityModelingReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityModelingReportResultsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
