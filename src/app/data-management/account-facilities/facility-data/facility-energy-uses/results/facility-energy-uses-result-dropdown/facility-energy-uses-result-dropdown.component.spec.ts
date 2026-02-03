import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesResultDropdownComponent } from './facility-energy-uses-result-dropdown.component';

describe('FacilityEnergyUsesResultDropdownComponent', () => {
  let component: FacilityEnergyUsesResultDropdownComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesResultDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesResultDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesResultDropdownComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
