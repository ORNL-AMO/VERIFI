import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisFacilitiesSummaryComponent } from './account-analysis-facilities-summary.component';

describe('AccountAnalysisFacilitiesSummaryComponent', () => {
  let component: AccountAnalysisFacilitiesSummaryComponent;
  let fixture: ComponentFixture<AccountAnalysisFacilitiesSummaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountAnalysisFacilitiesSummaryComponent]
    });
    fixture = TestBed.createComponent(AccountAnalysisFacilitiesSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
