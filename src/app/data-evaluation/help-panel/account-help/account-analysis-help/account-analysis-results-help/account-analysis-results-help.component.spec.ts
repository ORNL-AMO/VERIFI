import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisResultsHelpComponent } from './account-analysis-results-help.component';

describe('AccountAnalysisResultsHelpComponent', () => {
  let component: AccountAnalysisResultsHelpComponent;
  let fixture: ComponentFixture<AccountAnalysisResultsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisResultsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisResultsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
