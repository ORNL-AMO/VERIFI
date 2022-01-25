import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUnitDropdownComponent } from './energy-unit-dropdown.component';

describe('EnergyUnitDropdownComponent', () => {
  let component: EnergyUnitDropdownComponent;
  let fixture: ComponentFixture<EnergyUnitDropdownComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnergyUnitDropdownComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnergyUnitDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
