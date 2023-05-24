import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimaryEnergyConsumptionTableComponent } from './primary-energy-consumption-table.component';

describe('PrimaryEnergyConsumptionTableComponent', () => {
  let component: PrimaryEnergyConsumptionTableComponent;
  let fixture: ComponentFixture<PrimaryEnergyConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrimaryEnergyConsumptionTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrimaryEnergyConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
