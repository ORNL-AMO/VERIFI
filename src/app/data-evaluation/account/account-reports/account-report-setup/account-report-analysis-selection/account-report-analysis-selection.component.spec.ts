import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountReportAnalysisSelectionComponent } from './account-report-analysis-selection.component';

describe('AccountReportAnalysisSelectionComponent', () => {
  let component: AccountReportAnalysisSelectionComponent;
  let fixture: ComponentFixture<AccountReportAnalysisSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountReportAnalysisSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountReportAnalysisSelectionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
