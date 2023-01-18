import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountWaterReportComponent } from './account-water-report.component';

describe('AccountWaterReportComponent', () => {
  let component: AccountWaterReportComponent;
  let fixture: ComponentFixture<AccountWaterReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountWaterReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountWaterReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
