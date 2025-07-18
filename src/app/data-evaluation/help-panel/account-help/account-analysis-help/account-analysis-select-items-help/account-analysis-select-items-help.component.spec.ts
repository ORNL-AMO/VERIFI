import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisSelectItemsHelpComponent } from './account-analysis-select-items-help.component';

describe('AccountAnalysisSelectItemsHelpComponent', () => {
  let component: AccountAnalysisSelectItemsHelpComponent;
  let fixture: ComponentFixture<AccountAnalysisSelectItemsHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisSelectItemsHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisSelectItemsHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
