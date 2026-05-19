import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUseGroupComponent } from './facility-energy-use-group.component';

describe('FacilityEnergyUseGroupComponent', () => {
  let component: FacilityEnergyUseGroupComponent;
  let fixture: ComponentFixture<FacilityEnergyUseGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUseGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUseGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
