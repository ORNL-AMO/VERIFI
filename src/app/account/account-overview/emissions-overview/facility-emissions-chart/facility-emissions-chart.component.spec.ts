import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionsChartComponent } from './facility-emissions-chart.component';

describe('FacilityEmissionsChartComponent', () => {
  let component: FacilityEmissionsChartComponent;
  let fixture: ComponentFixture<FacilityEmissionsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityEmissionsChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
