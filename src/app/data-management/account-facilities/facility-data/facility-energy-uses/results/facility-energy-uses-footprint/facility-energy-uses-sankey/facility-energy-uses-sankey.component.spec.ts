import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesSankeyComponent } from './facility-energy-uses-sankey.component';

describe('FacilityEnergyUsesSankeyComponent', () => {
  let component: FacilityEnergyUsesSankeyComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesSankeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesSankeyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesSankeyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
