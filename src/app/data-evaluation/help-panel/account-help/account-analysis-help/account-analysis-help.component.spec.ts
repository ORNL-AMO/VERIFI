import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisHelpComponent } from './account-analysis-help.component';

describe('AccountAnalysisHelpComponent', () => {
  let component: AccountAnalysisHelpComponent;
  let fixture: ComponentFixture<AccountAnalysisHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
