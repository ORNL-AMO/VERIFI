import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterUtilitiesUsageChartComponent } from './water-utilities-usage-chart.component';

describe('WaterUtilitiesUsageChartComponent', () => {
  let component: WaterUtilitiesUsageChartComponent;
  let fixture: ComponentFixture<WaterUtilitiesUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WaterUtilitiesUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterUtilitiesUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
