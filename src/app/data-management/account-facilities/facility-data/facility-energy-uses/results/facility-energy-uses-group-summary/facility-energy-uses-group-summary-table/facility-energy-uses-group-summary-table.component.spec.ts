import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupSummaryTableComponent } from './facility-energy-uses-group-summary-table.component';

describe('FacilityEnergyUsesGroupSummaryTableComponent', () => {
  let component: FacilityEnergyUsesGroupSummaryTableComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupSummaryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupSummaryTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupSummaryTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
