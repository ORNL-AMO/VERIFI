import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityOverviewBannerComponent } from './facility-overview-banner.component';

describe('FacilityOverviewBannerComponent', () => {
  let component: FacilityOverviewBannerComponent;
  let fixture: ComponentFixture<FacilityOverviewBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityOverviewBannerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityOverviewBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
