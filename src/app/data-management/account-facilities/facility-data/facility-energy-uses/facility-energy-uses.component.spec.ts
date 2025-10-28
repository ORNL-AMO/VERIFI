import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesComponent } from './facility-energy-uses.component';

describe('FacilityEnergyUsesComponent', () => {
  let component: FacilityEnergyUsesComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
