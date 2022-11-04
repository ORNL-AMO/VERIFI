import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityEmissionsOverviewComponent } from './facility-emissions-overview.component';

describe('FacilityEmissionsOverviewComponent', () => {
  let component: FacilityEmissionsOverviewComponent;
  let fixture: ComponentFixture<FacilityEmissionsOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityEmissionsOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityEmissionsOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
