import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorTimeseriesGraphComponent } from './predictor-timeseries-graph.component';

describe('PredictorTimeseriesGraphComponent', () => {
  let component: PredictorTimeseriesGraphComponent;
  let fixture: ComponentFixture<PredictorTimeseriesGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorTimeseriesGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorTimeseriesGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
