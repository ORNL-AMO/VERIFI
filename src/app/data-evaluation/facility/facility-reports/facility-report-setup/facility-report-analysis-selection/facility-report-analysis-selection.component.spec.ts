import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportAnalysisSelectionComponent } from './facility-report-analysis-selection.component';

describe('FacilityReportAnalysisSelectionComponent', () => {
  let component: FacilityReportAnalysisSelectionComponent;
  let fixture: ComponentFixture<FacilityReportAnalysisSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportAnalysisSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportAnalysisSelectionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
