import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySepReportSetupComponent } from './facility-sep-report-setup.component';

describe('FacilitySepReportSetupComponent', () => {
  let component: FacilitySepReportSetupComponent;
  let fixture: ComponentFixture<FacilitySepReportSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySepReportSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySepReportSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
