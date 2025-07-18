import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisResultsComponent } from './account-analysis-results.component';

describe('AccountAnalysisResultsComponent', () => {
  let component: AccountAnalysisResultsComponent;
  let fixture: ComponentFixture<AccountAnalysisResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisResultsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountAnalysisResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
