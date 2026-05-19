import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupFootprintTableComponent } from './facility-energy-uses-group-footprint-table.component';

describe('FacilityEnergyUsesGroupFootprintTableComponent', () => {
  let component: FacilityEnergyUsesGroupFootprintTableComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupFootprintTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupFootprintTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupFootprintTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
