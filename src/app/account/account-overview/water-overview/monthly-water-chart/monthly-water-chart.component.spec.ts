import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyWaterChartComponent } from './monthly-water-chart.component';

describe('MonthlyWaterChartComponent', () => {
  let component: MonthlyWaterChartComponent;
  let fixture: ComponentFixture<MonthlyWaterChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyWaterChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyWaterChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
