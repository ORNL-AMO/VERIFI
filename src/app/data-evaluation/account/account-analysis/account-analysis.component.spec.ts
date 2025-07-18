import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountAnalysisComponent } from './account-analysis.component';

describe('AccountAnalysisComponent', () => {
  let component: AccountAnalysisComponent;
  let fixture: ComponentFixture<AccountAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
