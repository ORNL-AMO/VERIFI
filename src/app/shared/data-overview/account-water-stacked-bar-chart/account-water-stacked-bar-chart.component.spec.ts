import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountWaterStackedBarChartComponent } from './account-water-stacked-bar-chart.component';

describe('AccountWaterStackedBarChartComponent', () => {
  let component: AccountWaterStackedBarChartComponent;
  let fixture: ComponentFixture<AccountWaterStackedBarChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountWaterStackedBarChartComponent]
    });
    fixture = TestBed.createComponent(AccountWaterStackedBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
