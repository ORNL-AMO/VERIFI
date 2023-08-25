import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterPlantsReportDashboardComponent } from './better-plants-report-dashboard.component';

describe('BetterPlantsReportDashboardComponent', () => {
  let component: BetterPlantsReportDashboardComponent;
  let fixture: ComponentFixture<BetterPlantsReportDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BetterPlantsReportDashboardComponent]
    });
    fixture = TestBed.createComponent(BetterPlantsReportDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
