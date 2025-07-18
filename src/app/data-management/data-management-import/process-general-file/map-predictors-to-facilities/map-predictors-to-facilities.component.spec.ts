import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapPredictorsToFacilitiesComponent } from './map-predictors-to-facilities.component';

describe('MapPredictorsToFacilitiesComponent', () => {
  let component: MapPredictorsToFacilitiesComponent;
  let fixture: ComponentFixture<MapPredictorsToFacilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MapPredictorsToFacilitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapPredictorsToFacilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
