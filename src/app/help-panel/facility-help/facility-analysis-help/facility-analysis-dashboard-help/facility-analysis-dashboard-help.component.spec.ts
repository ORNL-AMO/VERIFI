import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisDashboardHelpComponent } from './facility-analysis-dashboard-help.component';

describe('FacilityAnalysisDashboardHelpComponent', () => {
  let component: FacilityAnalysisDashboardHelpComponent;
  let fixture: ComponentFixture<FacilityAnalysisDashboardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityAnalysisDashboardHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityAnalysisDashboardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
