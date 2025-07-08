import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyConsumptionHelpComponent } from './energy-consumption-help.component';

describe('EnergyConsumptionHelpComponent', () => {
  let component: EnergyConsumptionHelpComponent;
  let fixture: ComponentFixture<EnergyConsumptionHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyConsumptionHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EnergyConsumptionHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
