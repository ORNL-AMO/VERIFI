import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrelationPlotComponent } from './correlation-plot.component';

describe('CorrelationPlotComponent', () => {
  let component: CorrelationPlotComponent;
  let fixture: ComponentFixture<CorrelationPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorrelationPlotComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CorrelationPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
