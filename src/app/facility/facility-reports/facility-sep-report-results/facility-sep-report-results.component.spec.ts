import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitySepReportResultsComponent } from './facility-sep-report-results.component';

describe('FacilitySepReportResultsComponent', () => {
  let component: FacilitySepReportResultsComponent;
  let fixture: ComponentFixture<FacilitySepReportResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilitySepReportResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitySepReportResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
