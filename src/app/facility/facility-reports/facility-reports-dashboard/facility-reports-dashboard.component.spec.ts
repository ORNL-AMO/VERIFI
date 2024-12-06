import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportsDashboardComponent } from './facility-reports-dashboard.component';

describe('FacilityReportsDashboardComponent', () => {
  let component: FacilityReportsDashboardComponent;
  let fixture: ComponentFixture<FacilityReportsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
