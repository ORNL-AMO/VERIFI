import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisDashboardHelpComponent } from './account-analysis-dashboard-help.component';

describe('AccountAnalysisDashboardHelpComponent', () => {
  let component: AccountAnalysisDashboardHelpComponent;
  let fixture: ComponentFixture<AccountAnalysisDashboardHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisDashboardHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountAnalysisDashboardHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
