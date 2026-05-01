import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUseGroupModifyAnnualDataFormComponent } from './energy-use-group-modify-annual-data-form.component';

describe('EnergyUseGroupModifyAnnualDataFormComponent', () => {
  let component: EnergyUseGroupModifyAnnualDataFormComponent;
  let fixture: ComponentFixture<EnergyUseGroupModifyAnnualDataFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EnergyUseGroupModifyAnnualDataFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyUseGroupModifyAnnualDataFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
