import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterCostTimeseriesGraphComponent } from './meter-cost-timeseries-graph.component';

describe('MeterCostTimeseriesGraphComponent', () => {
  let component: MeterCostTimeseriesGraphComponent;
  let fixture: ComponentFixture<MeterCostTimeseriesGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterCostTimeseriesGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterCostTimeseriesGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
