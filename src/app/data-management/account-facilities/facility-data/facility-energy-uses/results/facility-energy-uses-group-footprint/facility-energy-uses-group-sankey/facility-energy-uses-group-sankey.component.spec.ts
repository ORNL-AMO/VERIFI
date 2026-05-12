import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyUsesGroupSankeyComponent } from './facility-energy-uses-group-sankey.component';

describe('FacilityEnergyUsesGroupSankeyComponent', () => {
  let component: FacilityEnergyUsesGroupSankeyComponent;
  let fixture: ComponentFixture<FacilityEnergyUsesGroupSankeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityEnergyUsesGroupSankeyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyUsesGroupSankeyComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
