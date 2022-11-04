import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyCostsChartComponent } from './monthly-costs-chart.component';

describe('MonthlyCostsChartComponent', () => {
  let component: MonthlyCostsChartComponent;
  let fixture: ComponentFixture<MonthlyCostsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyCostsChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyCostsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
