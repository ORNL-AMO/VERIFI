import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualAbsoluteEnergyConsumptionComponent } from './annual-absolute-energy-consumption.component';

describe('AnnualAbsoluteEnergyConsumptionComponent', () => {
  let component: AnnualAbsoluteEnergyConsumptionComponent;
  let fixture: ComponentFixture<AnnualAbsoluteEnergyConsumptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualAbsoluteEnergyConsumptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualAbsoluteEnergyConsumptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
