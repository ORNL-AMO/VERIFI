import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesFootprintTableComponent } from './facility-energy-uses-footprint-table.component';

describe('FacilityEnergyUsesFootprintTableComponent', () => {
  let component: FacilityEnergyUsesFootprintTableComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesFootprintTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesFootprintTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesFootprintTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
