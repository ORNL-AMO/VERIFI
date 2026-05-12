import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesSummaryTableComponent } from './facility-energy-uses-summary-table.component';

describe('FacilityEnergyUsesSummaryTableComponent', () => {
  let component: FacilityEnergyUsesSummaryTableComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesSummaryTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesSummaryTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
