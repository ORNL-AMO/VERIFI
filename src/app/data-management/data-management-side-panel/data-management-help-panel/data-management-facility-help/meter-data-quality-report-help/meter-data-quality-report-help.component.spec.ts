import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDataQualityReportHelpComponent } from './meter-data-quality-report-help.component';

describe('MeterDataQualityReportHelpComponent', () => {
  let component: MeterDataQualityReportHelpComponent;
  let fixture: ComponentFixture<MeterDataQualityReportHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterDataQualityReportHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterDataQualityReportHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
