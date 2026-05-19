import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesSetupOptionsComponent } from './facility-energy-uses-setup-options.component';

describe('FacilityEnergyUsesSetupOptionsComponent', () => {
  let component: FacilityEnergyUsesSetupOptionsComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesSetupOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesSetupOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesSetupOptionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
