import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySavingsReportSetupComponent } from './facility-savings-report-setup.component';

describe('FacilitySavingsReportSetupComponent', () => {
  let component: FacilitySavingsReportSetupComponent;
  let fixture: ComponentFixture<FacilitySavingsReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySavingsReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySavingsReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
