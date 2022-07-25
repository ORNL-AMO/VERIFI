import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisSetupHelpComponent } from './account-analysis-setup-help.component';

describe('AccountAnalysisSetupHelpComponent', () => {
  let component: AccountAnalysisSetupHelpComponent;
  let fixture: ComponentFixture<AccountAnalysisSetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisSetupHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountAnalysisSetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
