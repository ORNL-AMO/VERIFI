import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrelationPlotGraphItemComponent } from './correlation-plot-graph-item.component';

describe('CorrelationPlotGraphItemComponent', () => {
  let component: CorrelationPlotGraphItemComponent;
  let fixture: ComponentFixture<CorrelationPlotGraphItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorrelationPlotGraphItemComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorrelationPlotGraphItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
