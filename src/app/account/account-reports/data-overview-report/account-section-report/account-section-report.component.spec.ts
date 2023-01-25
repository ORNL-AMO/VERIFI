import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSectionReportComponent } from './account-section-report.component';

describe('AccountSectionReportComponent', () => {
  let component: AccountSectionReportComponent;
  let fixture: ComponentFixture<AccountSectionReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountSectionReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSectionReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
