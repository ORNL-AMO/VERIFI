import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisSetupHelpComponent } from './facility-analysis-setup-help.component';

describe('FacilityAnalysisSetupHelpComponent', () => {
  let component: FacilityAnalysisSetupHelpComponent;
  let fixture: ComponentFixture<FacilityAnalysisSetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityAnalysisSetupHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisSetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
