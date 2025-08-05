import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEnergyOverviewComponent } from './facility-energy-overview.component';

describe('FacilityEnergyOverviewComponent', () => {
  let component: FacilityEnergyOverviewComponent;
  let fixture: ComponentFixture<FacilityEnergyOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityEnergyOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEnergyOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
