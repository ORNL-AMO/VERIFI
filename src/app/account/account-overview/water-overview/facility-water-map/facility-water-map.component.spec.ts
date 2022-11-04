import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityWaterMapComponent } from './facility-water-map.component';

describe('FacilityWaterMapComponent', () => {
  let component: FacilityWaterMapComponent;
  let fixture: ComponentFixture<FacilityWaterMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityWaterMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityWaterMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
