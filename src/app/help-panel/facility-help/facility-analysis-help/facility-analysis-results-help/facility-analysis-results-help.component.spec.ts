import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisResultsHelpComponent } from './facility-analysis-results-help.component';

describe('FacilityAnalysisResultsHelpComponent', () => {
  let component: FacilityAnalysisResultsHelpComponent;
  let fixture: ComponentFixture<FacilityAnalysisResultsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityAnalysisResultsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisResultsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
