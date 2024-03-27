import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualFacilityClimateSummaryTableComponent } from './annual-facility-climate-summary-table.component';

describe('AnnualFacilityClimateSummaryTableComponent', () => {
  let component: AnnualFacilityClimateSummaryTableComponent;
  let fixture: ComponentFixture<AnnualFacilityClimateSummaryTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AnnualFacilityClimateSummaryTableComponent]
    });
    fixture = TestBed.createComponent(AnnualFacilityClimateSummaryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
