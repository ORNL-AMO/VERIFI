import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountUtilityEnergyUseTableComponent } from './account-utility-energy-use-table.component';

describe('AccountUtilityEnergyUseTableComponent', () => {
  let component: AccountUtilityEnergyUseTableComponent;
  let fixture: ComponentFixture<AccountUtilityEnergyUseTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AccountUtilityEnergyUseTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountUtilityEnergyUseTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
