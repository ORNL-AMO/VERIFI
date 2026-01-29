import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupFootprintComponent } from './facility-energy-uses-group-footprint.component';

describe('FacilityEnergyUsesGroupFootprintComponent', () => {
  let component: FacilityEnergyUsesGroupFootprintComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupFootprintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupFootprintComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupFootprintComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
