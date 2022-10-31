import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityWaterChartComponent } from './utility-water-chart.component';

describe('UtilityWaterChartComponent', () => {
  let component: UtilityWaterChartComponent;
  let fixture: ComponentFixture<UtilityWaterChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityWaterChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityWaterChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
