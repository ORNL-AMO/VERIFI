import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterReadingsReportComponent } from './meter-readings-report.component';

describe('MeterReadingsReportComponent', () => {
  let component: MeterReadingsReportComponent;
  let fixture: ComponentFixture<MeterReadingsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeterReadingsReportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterReadingsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
