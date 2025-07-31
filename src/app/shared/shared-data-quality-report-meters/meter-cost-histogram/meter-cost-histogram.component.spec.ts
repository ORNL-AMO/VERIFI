import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterCostHistogramComponent } from './meter-cost-histogram.component';

describe('MeterCostHistogramComponent', () => {
  let component: MeterCostHistogramComponent;
  let fixture: ComponentFixture<MeterCostHistogramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterCostHistogramComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterCostHistogramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
