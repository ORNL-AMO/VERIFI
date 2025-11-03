import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesTimeSeriesComponent } from './facility-energy-uses-time-series.component';

describe('FacilityEnergyUsesTimeSeriesComponent', () => {
  let component: FacilityEnergyUsesTimeSeriesComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesTimeSeriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesTimeSeriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesTimeSeriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
