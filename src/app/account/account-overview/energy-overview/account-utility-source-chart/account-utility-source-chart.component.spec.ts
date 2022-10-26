import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountUtilitySourceChartComponent } from './account-utility-source-chart.component';

describe('AccountUtilitySourceChartComponent', () => {
  let component: AccountUtilitySourceChartComponent;
  let fixture: ComponentFixture<AccountUtilitySourceChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountUtilitySourceChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountUtilitySourceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
