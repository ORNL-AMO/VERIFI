import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetersOverviewStackedLineChartComponent } from './meters-overview-stacked-line-chart.component';

describe('MetersOverviewStackedLineChartComponent', () => {
  let component: MetersOverviewStackedLineChartComponent;
  let fixture: ComponentFixture<MetersOverviewStackedLineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MetersOverviewStackedLineChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetersOverviewStackedLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
