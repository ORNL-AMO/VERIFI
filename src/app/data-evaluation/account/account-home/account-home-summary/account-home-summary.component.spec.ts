import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountHomeSummaryComponent } from './account-home-summary.component';

describe('AccountHomeSummaryComponent', () => {
  let component: AccountHomeSummaryComponent;
  let fixture: ComponentFixture<AccountHomeSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountHomeSummaryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountHomeSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
