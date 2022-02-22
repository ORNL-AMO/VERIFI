import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityDashboardMenuComponent } from './facility-dashboard-menu.component';

describe('FacilityDashboardMenuComponent', () => {
  let component: FacilityDashboardMenuComponent;
  let fixture: ComponentFixture<FacilityDashboardMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityDashboardMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityDashboardMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
