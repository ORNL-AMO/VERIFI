import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterMetersOverviewChartComponent } from './water-meters-overview-chart.component';

describe('WaterMetersOverviewChartComponent', () => {
  let component: WaterMetersOverviewChartComponent;
  let fixture: ComponentFixture<WaterMetersOverviewChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WaterMetersOverviewChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterMetersOverviewChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
