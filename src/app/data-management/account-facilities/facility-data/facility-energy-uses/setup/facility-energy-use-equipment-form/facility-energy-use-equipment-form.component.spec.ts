import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUseEquipmentFormComponent } from './facility-energy-use-equipment-form.component';

describe('FacilityEnergyUseEquipmentFormComponent', () => {
  let component: FacilityEnergyUseEquipmentFormComponent;
  let fixture: ComponentFixture<FacilityEnergyUseEquipmentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUseEquipmentFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUseEquipmentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
