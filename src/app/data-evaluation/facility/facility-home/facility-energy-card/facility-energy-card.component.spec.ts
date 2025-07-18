import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyCardComponent } from './facility-energy-card.component';

describe('FacilityEnergyCardComponent', () => {
  let component: FacilityEnergyCardComponent;
  let fixture: ComponentFixture<FacilityEnergyCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FacilityEnergyCardComponent]
    });
    fixture = TestBed.createComponent(FacilityEnergyCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
