import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataOverviewReportHelpComponent } from './data-overview-report-help.component';

describe('DataOverviewReportHelpComponent', () => {
  let component: DataOverviewReportHelpComponent;
  let fixture: ComponentFixture<DataOverviewReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataOverviewReportHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataOverviewReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
