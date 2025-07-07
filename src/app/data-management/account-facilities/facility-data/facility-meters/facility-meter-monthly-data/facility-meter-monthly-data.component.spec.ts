import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMeterMonthlyDataComponent } from './facility-meter-monthly-data.component';

describe('FacilityMeterMonthlyDataComponent', () => {
  let component: FacilityMeterMonthlyDataComponent;
  let fixture: ComponentFixture<FacilityMeterMonthlyDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMeterMonthlyDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityMeterMonthlyDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
