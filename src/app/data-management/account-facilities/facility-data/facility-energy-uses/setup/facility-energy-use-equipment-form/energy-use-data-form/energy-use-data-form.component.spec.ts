import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUseDataFormComponent } from './energy-use-data-form.component';

describe('EnergyUseDataFormComponent', () => {
  let component: EnergyUseDataFormComponent;
  let fixture: ComponentFixture<EnergyUseDataFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EnergyUseDataFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyUseDataFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
