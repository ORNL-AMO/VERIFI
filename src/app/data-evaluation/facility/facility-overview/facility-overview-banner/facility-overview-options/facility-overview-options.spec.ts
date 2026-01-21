import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityOverviewOptions } from './facility-overview-options';

describe('FacilityOverviewOptions', () => {
  let component: FacilityOverviewOptions;
  let fixture: ComponentFixture<FacilityOverviewOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityOverviewOptions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityOverviewOptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
