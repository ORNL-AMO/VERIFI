import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUseEquipmentComponent } from './facility-energy-use-equipment.component';

describe('FacilityEnergyUseEquipmentComponent', () => {
  let component: FacilityEnergyUseEquipmentComponent;
  let fixture: ComponentFixture<FacilityEnergyUseEquipmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUseEquipmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUseEquipmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
