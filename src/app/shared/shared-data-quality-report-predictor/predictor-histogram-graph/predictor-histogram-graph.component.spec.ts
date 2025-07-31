import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictorHistogramGraphComponent } from './predictor-histogram-graph.component';

describe('PredictorHistogramGraphComponent', () => {
  let component: PredictorHistogramGraphComponent;
  let fixture: ComponentFixture<PredictorHistogramGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PredictorHistogramGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictorHistogramGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
