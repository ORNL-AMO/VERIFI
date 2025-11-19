import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisDetailsTableComponent } from './account-analysis-details-table.component';

describe('AccountAnalysisDetailsTableComponent', () => {
  let component: AccountAnalysisDetailsTableComponent;
  let fixture: ComponentFixture<AccountAnalysisDetailsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountAnalysisDetailsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisDetailsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
