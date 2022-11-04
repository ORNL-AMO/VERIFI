import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisListComponent } from './account-analysis-list.component';

describe('AccountAnalysisListComponent', () => {
  let component: AccountAnalysisListComponent;
  let fixture: ComponentFixture<AccountAnalysisListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountAnalysisListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
