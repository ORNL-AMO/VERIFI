import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintReportButtonComponent } from './print-report-button.component';

describe('PrintReportButtonComponent', () => {
  let component: PrintReportButtonComponent;
  let fixture: ComponentFixture<PrintReportButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrintReportButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintReportButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
