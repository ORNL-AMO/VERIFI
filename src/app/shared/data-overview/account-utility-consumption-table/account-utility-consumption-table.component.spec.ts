import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountUtilityConsumptionTableComponent } from './account-utility-consumption-table.component';

describe('AccountUtilityConsumptionTableComponent', () => {
  let component: AccountUtilityConsumptionTableComponent;
  let fixture: ComponentFixture<AccountUtilityConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountUtilityConsumptionTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountUtilityConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
