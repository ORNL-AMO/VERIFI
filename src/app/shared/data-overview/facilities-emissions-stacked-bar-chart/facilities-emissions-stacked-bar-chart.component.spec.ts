import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitiesEmissionsStackedBarChartComponent } from './facilities-emissions-stacked-bar-chart.component';

describe('FacilitiesEmissionsStackedBarChartComponent', () => {
  let component: FacilitiesEmissionsStackedBarChartComponent;
  let fixture: ComponentFixture<FacilitiesEmissionsStackedBarChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FacilitiesEmissionsStackedBarChartComponent]
    });
    fixture = TestBed.createComponent(FacilitiesEmissionsStackedBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
