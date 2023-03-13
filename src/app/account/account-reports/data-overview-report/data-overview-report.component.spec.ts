import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataOverviewReportComponent } from './data-overview-report.component';

describe('DataOverviewReportComponent', () => {
  let component: DataOverviewReportComponent;
  let fixture: ComponentFixture<DataOverviewReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataOverviewReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataOverviewReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
