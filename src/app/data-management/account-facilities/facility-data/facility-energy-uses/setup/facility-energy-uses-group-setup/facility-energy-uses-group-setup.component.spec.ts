import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupSetupComponent } from './facility-energy-uses-group-setup.component';

describe('FacilityEnergyUsesGroupSetupComponent', () => {
  let component: FacilityEnergyUsesGroupSetupComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
