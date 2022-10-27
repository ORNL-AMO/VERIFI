import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCostChartComponent } from './facility-cost-chart.component';

describe('FacilityCostChartComponent', () => {
  let component: FacilityCostChartComponent;
  let fixture: ComponentFixture<FacilityCostChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityCostChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCostChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
