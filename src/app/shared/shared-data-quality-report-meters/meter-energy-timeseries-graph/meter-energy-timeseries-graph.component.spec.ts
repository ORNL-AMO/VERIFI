import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterEnergyTimeseriesGraphComponent } from './meter-energy-timeseries-graph.component';

describe('MeterEnergyTimeseriesGraphComponent', () => {
  let component: MeterEnergyTimeseriesGraphComponent;
  let fixture: ComponentFixture<MeterEnergyTimeseriesGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterEnergyTimeseriesGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterEnergyTimeseriesGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
