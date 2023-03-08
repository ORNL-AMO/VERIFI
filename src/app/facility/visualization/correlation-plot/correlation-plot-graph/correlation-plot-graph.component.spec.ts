import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrelationPlotGraphComponent } from './correlation-plot-graph.component';

describe('CorrelationPlotGraphComponent', () => {
  let component: CorrelationPlotGraphComponent;
  let fixture: ComponentFixture<CorrelationPlotGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorrelationPlotGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorrelationPlotGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
