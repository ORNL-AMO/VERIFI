import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisEnergyDashboardComponent } from './account-analysis-energy-dashboard.component';

describe('AccountAnalysisEnergyDashboardComponent', () => {
  let component: AccountAnalysisEnergyDashboardComponent;
  let fixture: ComponentFixture<AccountAnalysisEnergyDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountAnalysisEnergyDashboardComponent]
    });
    fixture = TestBed.createComponent(AccountAnalysisEnergyDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
