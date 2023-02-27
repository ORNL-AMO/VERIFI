import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyConsumptionTableComponent } from './energy-consumption-table.component';

describe('EnergyConsumptionTableComponent', () => {
  let component: EnergyConsumptionTableComponent;
  let fixture: ComponentFixture<EnergyConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyConsumptionTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
