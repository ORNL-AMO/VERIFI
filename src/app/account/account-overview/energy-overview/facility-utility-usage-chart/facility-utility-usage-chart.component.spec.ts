import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityUtilityUsageChartComponent } from './facility-utility-usage-chart.component';

describe('FacilityUtilityUsageChartComponent', () => {
  let component: FacilityUtilityUsageChartComponent;
  let fixture: ComponentFixture<FacilityUtilityUsageChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityUtilityUsageChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityUtilityUsageChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
