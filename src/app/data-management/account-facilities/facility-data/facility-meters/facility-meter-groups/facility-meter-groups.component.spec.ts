import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityMeterGroupsComponent } from './facility-meter-groups.component';

describe('FacilityMeterGroupsComponent', () => {
  let component: FacilityMeterGroupsComponent;
  let fixture: ComponentFixture<FacilityMeterGroupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityMeterGroupsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityMeterGroupsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
