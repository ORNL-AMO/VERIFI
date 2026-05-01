import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUseGroupManagementComponent } from './facility-energy-use-group-management.component';

describe('FacilityEnergyUseGroupManagementComponent', () => {
  let component: FacilityEnergyUseGroupManagementComponent;
  let fixture: ComponentFixture<FacilityEnergyUseGroupManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUseGroupManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUseGroupManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
