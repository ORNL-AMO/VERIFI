import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityCostChartComponent } from './utility-cost-chart.component';

describe('UtilityCostChartComponent', () => {
  let component: UtilityCostChartComponent;
  let fixture: ComponentFixture<UtilityCostChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityCostChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityCostChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
