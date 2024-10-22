import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPrintReportButtonComponent } from './facility-print-report-button.component';

describe('FacilityPrintReportButtonComponent', () => {
  let component: FacilityPrintReportButtonComponent;
  let fixture: ComponentFixture<FacilityPrintReportButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityPrintReportButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityPrintReportButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
