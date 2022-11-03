import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityWaterOverviewComponent } from './facility-water-overview.component';

describe('FacilityWaterOverviewComponent', () => {
  let component: FacilityWaterOverviewComponent;
  let fixture: ComponentFixture<FacilityWaterOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityWaterOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityWaterOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
