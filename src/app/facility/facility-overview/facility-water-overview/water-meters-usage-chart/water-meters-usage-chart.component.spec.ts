import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterMetersUsageChartComponent } from './water-meters-usage-chart.component';

describe('WaterMetersUsageChartComponent', () => {
  let component: WaterMetersUsageChartComponent;
  let fixture: ComponentFixture<WaterMetersUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WaterMetersUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterMetersUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
