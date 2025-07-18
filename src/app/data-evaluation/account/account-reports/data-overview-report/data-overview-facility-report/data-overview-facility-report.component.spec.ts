import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataOverviewFacilityReportComponent } from './data-overview-facility-report.component';

describe('DataOverviewFacilityReportComponent', () => {
  let component: DataOverviewFacilityReportComponent;
  let fixture: ComponentFixture<DataOverviewFacilityReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataOverviewFacilityReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataOverviewFacilityReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
