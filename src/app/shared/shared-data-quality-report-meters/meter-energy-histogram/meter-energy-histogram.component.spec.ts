import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterEnergyHistogramComponent } from './meter-energy-histogram.component';

describe('MeterEnergyHistogramComponent', () => {
  let component: MeterEnergyHistogramComponent;
  let fixture: ComponentFixture<MeterEnergyHistogramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterEnergyHistogramComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterEnergyHistogramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
