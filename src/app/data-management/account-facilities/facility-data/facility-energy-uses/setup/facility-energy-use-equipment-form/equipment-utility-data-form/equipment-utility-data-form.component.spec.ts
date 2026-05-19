import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipmentUtilityDataFormComponent } from './equipment-utility-data-form.component';

describe('EquipmentUtilityDataFormComponent', () => {
  let component: EquipmentUtilityDataFormComponent;
  let fixture: ComponentFixture<EquipmentUtilityDataFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EquipmentUtilityDataFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipmentUtilityDataFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
