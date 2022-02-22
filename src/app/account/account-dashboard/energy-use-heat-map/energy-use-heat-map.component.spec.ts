import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUseHeatMapComponent } from './energy-use-heat-map.component';

describe('EnergyUseHeatMapComponent', () => {
  let component: EnergyUseHeatMapComponent;
  let fixture: ComponentFixture<EnergyUseHeatMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnergyUseHeatMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnergyUseHeatMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
