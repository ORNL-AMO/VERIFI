import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilitiesUsageChartComponent } from './utilities-usage-chart.component';

describe('UtilitiesUsageChartComponent', () => {
  let component: UtilitiesUsageChartComponent;
  let fixture: ComponentFixture<UtilitiesUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilitiesUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilitiesUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
