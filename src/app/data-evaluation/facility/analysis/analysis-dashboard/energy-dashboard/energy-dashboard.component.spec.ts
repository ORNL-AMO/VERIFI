import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyDashboardComponent } from './energy-dashboard.component';

describe('EnergyDashboardComponent', () => {
  let component: EnergyDashboardComponent;
  let fixture: ComponentFixture<EnergyDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EnergyDashboardComponent]
    });
    fixture = TestBed.createComponent(EnergyDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
