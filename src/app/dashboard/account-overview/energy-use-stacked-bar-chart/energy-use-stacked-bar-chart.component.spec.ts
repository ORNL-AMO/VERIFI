import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUseStackedBarChartComponent } from './energy-use-stacked-bar-chart.component';

describe('EnergyUseStackedBarChartComponent', () => {
  let component: EnergyUseStackedBarChartComponent;
  let fixture: ComponentFixture<EnergyUseStackedBarChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnergyUseStackedBarChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnergyUseStackedBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
