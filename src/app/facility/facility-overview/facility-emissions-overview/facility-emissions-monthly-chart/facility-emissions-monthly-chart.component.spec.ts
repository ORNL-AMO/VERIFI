import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionsMonthlyChartComponent } from './facility-emissions-monthly-chart.component';

describe('FacilityEmissionsMonthlyChartComponent', () => {
  let component: FacilityEmissionsMonthlyChartComponent;
  let fixture: ComponentFixture<FacilityEmissionsMonthlyChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityEmissionsMonthlyChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionsMonthlyChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
