import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnnualAnalysisTableComponent } from './account-annual-analysis-table.component';

describe('AccountAnnualAnalysisTableComponent', () => {
  let component: AccountAnnualAnalysisTableComponent;
  let fixture: ComponentFixture<AccountAnnualAnalysisTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountAnnualAnalysisTableComponent]
    });
    fixture = TestBed.createComponent(AccountAnnualAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
