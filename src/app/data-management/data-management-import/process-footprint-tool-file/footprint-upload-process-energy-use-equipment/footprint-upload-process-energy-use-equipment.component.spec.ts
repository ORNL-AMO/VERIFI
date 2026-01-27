import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FootprintUploadProcessEnergyUseEquipmentComponent } from './footprint-upload-process-energy-use-equipment.component';

describe('FootprintUploadProcessEnergyUseEquipmentComponent', () => {
  let component: FootprintUploadProcessEnergyUseEquipmentComponent;
  let fixture: ComponentFixture<FootprintUploadProcessEnergyUseEquipmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FootprintUploadProcessEnergyUseEquipmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FootprintUploadProcessEnergyUseEquipmentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
