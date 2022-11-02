import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyEmissionsChartComponent } from './monthly-emissions-chart.component';

describe('MonthlyEmissionsChartComponent', () => {
  let component: MonthlyEmissionsChartComponent;
  let fixture: ComponentFixture<MonthlyEmissionsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyEmissionsChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyEmissionsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
