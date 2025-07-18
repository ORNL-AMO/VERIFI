import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleEnergyUseTableComponent } from './vehicle-energy-use-table.component';

describe('VehicleEnergyUseTableComponent', () => {
  let component: VehicleEnergyUseTableComponent;
  let fixture: ComponentFixture<VehicleEnergyUseTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VehicleEnergyUseTableComponent]
    });
    fixture = TestBed.createComponent(VehicleEnergyUseTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
