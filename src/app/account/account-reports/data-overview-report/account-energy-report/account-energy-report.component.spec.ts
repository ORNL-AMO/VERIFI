import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountEnergyReportComponent } from './account-energy-report.component';

describe('AccountEnergyReportComponent', () => {
  let component: AccountEnergyReportComponent;
  let fixture: ComponentFixture<AccountEnergyReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountEnergyReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountEnergyReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
