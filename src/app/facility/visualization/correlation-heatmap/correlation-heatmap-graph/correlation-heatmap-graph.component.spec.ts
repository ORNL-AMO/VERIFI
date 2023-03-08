import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrelationHeatmapGraphComponent } from './correlation-heatmap-graph.component';

describe('CorrelationHeatmapGraphComponent', () => {
  let component: CorrelationHeatmapGraphComponent;
  let fixture: ComponentFixture<CorrelationHeatmapGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorrelationHeatmapGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorrelationHeatmapGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
