import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEmissionsReportComponent } from './account-emissions-report.component';

describe('AccountEmissionsReportComponent', () => {
  let component: AccountEmissionsReportComponent;
  let fixture: ComponentFixture<AccountEmissionsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountEmissionsReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountEmissionsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
