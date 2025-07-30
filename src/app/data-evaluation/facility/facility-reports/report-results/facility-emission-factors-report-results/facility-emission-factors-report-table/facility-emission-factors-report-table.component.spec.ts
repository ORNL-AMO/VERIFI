import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionFactorsReportTableComponent } from './facility-emission-factors-report-table.component';

describe('FacilityEmissionFactorsReportTableComponent', () => {
  let component: FacilityEmissionFactorsReportTableComponent;
  let fixture: ComponentFixture<FacilityEmissionFactorsReportTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEmissionFactorsReportTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionFactorsReportTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
