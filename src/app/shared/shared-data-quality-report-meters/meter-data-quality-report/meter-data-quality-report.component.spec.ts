import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDataQualityReportComponent } from './meter-data-quality-report.component';

describe('MeterDataQualityReportComponent', () => {
  let component: MeterDataQualityReportComponent;
  let fixture: ComponentFixture<MeterDataQualityReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterDataQualityReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterDataQualityReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
