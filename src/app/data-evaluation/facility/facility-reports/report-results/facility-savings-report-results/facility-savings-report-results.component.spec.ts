import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySavingsReportResultsComponent } from './facility-savings-report-results.component';

describe('FacilitySavingsReportResultsComponent', () => {
  let component: FacilitySavingsReportResultsComponent;
  let fixture: ComponentFixture<FacilitySavingsReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySavingsReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySavingsReportResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
