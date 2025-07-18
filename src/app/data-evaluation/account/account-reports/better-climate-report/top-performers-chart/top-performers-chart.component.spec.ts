import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopPerformersChartComponent } from './top-performers-chart.component';

describe('TopPerformersChartComponent', () => {
  let component: TopPerformersChartComponent;
  let fixture: ComponentFixture<TopPerformersChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TopPerformersChartComponent]
    });
    fixture = TestBed.createComponent(TopPerformersChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
