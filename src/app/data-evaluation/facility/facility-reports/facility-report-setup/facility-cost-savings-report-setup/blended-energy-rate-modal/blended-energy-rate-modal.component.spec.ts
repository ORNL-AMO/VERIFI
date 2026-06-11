import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlendedEnergyRateModalComponent } from './blended-energy-rate-modal.component';

describe('BlendedEnergyRateModalComponent', () => {
  let component: BlendedEnergyRateModalComponent;
  let fixture: ComponentFixture<BlendedEnergyRateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BlendedEnergyRateModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlendedEnergyRateModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
