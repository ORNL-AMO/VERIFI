import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportUtilityUsageTableComponent } from './facility-report-utility-usage-table.component';

describe('FacilityReportUtilityUsageTableComponent', () => {
  let component: FacilityReportUtilityUsageTableComponent;
  let fixture: ComponentFixture<FacilityReportUtilityUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityReportUtilityUsageTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityReportUtilityUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
