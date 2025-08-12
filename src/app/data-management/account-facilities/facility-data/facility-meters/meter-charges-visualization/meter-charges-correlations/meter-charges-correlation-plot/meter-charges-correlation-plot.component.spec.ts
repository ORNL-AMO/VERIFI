import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterChargesCorrelationPlotComponent } from './meter-charges-correlation-plot.component';

describe('MeterChargesCorrelationPlotComponent', () => {
  let component: MeterChargesCorrelationPlotComponent;
  let fixture: ComponentFixture<MeterChargesCorrelationPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterChargesCorrelationPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterChargesCorrelationPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
