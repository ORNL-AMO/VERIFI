import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapMetersToFacilitiesComponent } from './map-meters-to-facilities.component';

describe('MapMetersToFacilitiesComponent', () => {
  let component: MapMetersToFacilitiesComponent;
  let fixture: ComponentFixture<MapMetersToFacilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MapMetersToFacilitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapMetersToFacilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
