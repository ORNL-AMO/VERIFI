import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisWaterDashboardComponent } from './account-analysis-water-dashboard.component';

describe('AccountAnalysisWaterDashboardComponent', () => {
  let component: AccountAnalysisWaterDashboardComponent;
  let fixture: ComponentFixture<AccountAnalysisWaterDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountAnalysisWaterDashboardComponent]
    });
    fixture = TestBed.createComponent(AccountAnalysisWaterDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
