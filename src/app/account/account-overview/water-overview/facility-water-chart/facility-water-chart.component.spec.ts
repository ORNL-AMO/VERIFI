import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityWaterChartComponent } from './facility-water-chart.component';

describe('FacilityWaterChartComponent', () => {
  let component: FacilityWaterChartComponent;
  let fixture: ComponentFixture<FacilityWaterChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityWaterChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityWaterChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
