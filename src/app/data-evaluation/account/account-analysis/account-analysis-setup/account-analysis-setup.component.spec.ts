import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisSetupComponent } from './account-analysis-setup.component';

describe('AccountAnalysisSetupComponent', () => {
  let component: AccountAnalysisSetupComponent;
  let fixture: ComponentFixture<AccountAnalysisSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisSetupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountAnalysisSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
