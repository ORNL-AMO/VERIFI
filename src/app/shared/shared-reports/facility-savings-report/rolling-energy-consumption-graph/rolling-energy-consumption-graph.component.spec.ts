import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RollingEnergyConsumptionGraphComponent } from './rolling-energy-consumption-graph.component';

describe('RollingEnergyConsumptionGraphComponent', () => {
  let component: RollingEnergyConsumptionGraphComponent;
  let fixture: ComponentFixture<RollingEnergyConsumptionGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RollingEnergyConsumptionGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RollingEnergyConsumptionGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
