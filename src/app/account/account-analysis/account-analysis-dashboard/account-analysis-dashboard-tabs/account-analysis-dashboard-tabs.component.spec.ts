import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisDashboardTabsComponent } from './account-analysis-dashboard-tabs.component';

describe('AccountAnalysisDashboardTabsComponent', () => {
  let component: AccountAnalysisDashboardTabsComponent;
  let fixture: ComponentFixture<AccountAnalysisDashboardTabsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountAnalysisDashboardTabsComponent]
    });
    fixture = TestBed.createComponent(AccountAnalysisDashboardTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
