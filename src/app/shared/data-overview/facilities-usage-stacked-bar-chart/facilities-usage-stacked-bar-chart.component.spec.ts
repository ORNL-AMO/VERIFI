import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitiesUsageStackedBarChartComponent } from './facilities-usage-stacked-bar-chart.component';

describe('FacilitiesUsageStackedBarChartComponent', () => {
  let component: FacilitiesUsageStackedBarChartComponent;
  let fixture: ComponentFixture<FacilitiesUsageStackedBarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilitiesUsageStackedBarChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilitiesUsageStackedBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
