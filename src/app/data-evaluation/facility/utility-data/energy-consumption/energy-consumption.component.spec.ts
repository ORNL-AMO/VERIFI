import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyConsumptionComponent } from './energy-consumption.component';

describe('EnergyConsumptionComponent', () => {
  let component: EnergyConsumptionComponent;
  let fixture: ComponentFixture<EnergyConsumptionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnergyConsumptionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnergyConsumptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
