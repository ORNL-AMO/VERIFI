import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapMeterGroupsToEquipmentComponent } from './map-meter-groups-to-equipment.component';

describe('MapMeterGroupsToEquipmentComponent', () => {
  let component: MapMeterGroupsToEquipmentComponent;
  let fixture: ComponentFixture<MapMeterGroupsToEquipmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MapMeterGroupsToEquipmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapMeterGroupsToEquipmentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
