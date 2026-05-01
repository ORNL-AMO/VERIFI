import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesFootprintComponent } from './facility-energy-uses-footprint.component';

describe('FacilityEnergyUsesFootprintComponent', () => {
  let component: FacilityEnergyUsesFootprintComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesFootprintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesFootprintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesFootprintComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
