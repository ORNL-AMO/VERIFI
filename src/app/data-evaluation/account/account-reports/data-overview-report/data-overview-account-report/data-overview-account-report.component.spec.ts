import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataOverviewAccountReportComponent } from './data-overview-account-report.component';

describe('DataOverviewAccountReportComponent', () => {
  let component: DataOverviewAccountReportComponent;
  let fixture: ComponentFixture<DataOverviewAccountReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataOverviewAccountReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataOverviewAccountReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
