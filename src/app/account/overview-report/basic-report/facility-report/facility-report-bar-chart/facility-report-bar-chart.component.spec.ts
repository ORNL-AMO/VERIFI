import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportBarChartComponent } from './facility-report-bar-chart.component';

describe('FacilityReportBarChartComponent', () => {
  let component: FacilityReportBarChartComponent;
  let fixture: ComponentFixture<FacilityReportBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityReportBarChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityReportBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
