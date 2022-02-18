import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportFacilityBarChartComponent } from './account-report-facility-bar-chart.component';

describe('AccountReportFacilityBarChartComponent', () => {
  let component: AccountReportFacilityBarChartComponent;
  let fixture: ComponentFixture<AccountReportFacilityBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountReportFacilityBarChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountReportFacilityBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
