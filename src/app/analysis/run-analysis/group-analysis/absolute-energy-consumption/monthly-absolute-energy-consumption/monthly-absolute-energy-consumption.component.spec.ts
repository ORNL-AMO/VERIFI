import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAbsoluteEnergyConsumptionComponent } from './monthly-absolute-energy-consumption.component';

describe('MonthlyAbsoluteEnergyConsumptionComponent', () => {
  let component: MonthlyAbsoluteEnergyConsumptionComponent;
  let fixture: ComponentFixture<MonthlyAbsoluteEnergyConsumptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAbsoluteEnergyConsumptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAbsoluteEnergyConsumptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
