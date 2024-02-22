import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomFuelDataDashboardComponent } from './custom-fuel-data-dashboard.component';

describe('CustomFuelDataDashboardComponent', () => {
  let component: CustomFuelDataDashboardComponent;
  let fixture: ComponentFixture<CustomFuelDataDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomFuelDataDashboardComponent]
    });
    fixture = TestBed.createComponent(CustomFuelDataDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
