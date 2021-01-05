import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityHeatMapComponent } from './facility-heat-map.component';

describe('FacilityHeatMapComponent', () => {
  let component: FacilityHeatMapComponent;
  let fixture: ComponentFixture<FacilityHeatMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FacilityHeatMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityHeatMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
