import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesModifyAnnualDataComponent } from './facility-energy-uses-modify-annual-data.component';

describe('FacilityEnergyUsesModifyAnnualDataComponent', () => {
  let component: FacilityEnergyUsesModifyAnnualDataComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesModifyAnnualDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesModifyAnnualDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesModifyAnnualDataComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
