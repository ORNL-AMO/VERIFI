import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsStackedLineChartComponent } from './emissions-stacked-line-chart.component';

describe('EmissionsStackedLineChartComponent', () => {
  let component: EmissionsStackedLineChartComponent;
  let fixture: ComponentFixture<EmissionsStackedLineChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmissionsStackedLineChartComponent]
    });
    fixture = TestBed.createComponent(EmissionsStackedLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
