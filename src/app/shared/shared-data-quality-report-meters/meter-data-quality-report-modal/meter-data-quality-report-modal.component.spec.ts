import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterDataQualityReportModalComponent } from './meter-data-quality-report-modal.component';

describe('MeterDataQualityReportModalComponent', () => {
  let component: MeterDataQualityReportModalComponent;
  let fixture: ComponentFixture<MeterDataQualityReportModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterDataQualityReportModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterDataQualityReportModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
