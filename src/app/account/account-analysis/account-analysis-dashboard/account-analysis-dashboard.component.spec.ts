import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisDashboardComponent } from './account-analysis-dashboard.component';

describe('AccountAnalysisDashboardComponent', () => {
  let component: AccountAnalysisDashboardComponent;
  let fixture: ComponentFixture<AccountAnalysisDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisDashboardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountAnalysisDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
