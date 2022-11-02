import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityEmissionsChartComponent } from './utility-emissions-chart.component';

describe('UtilityEmissionsChartComponent', () => {
  let component: UtilityEmissionsChartComponent;
  let fixture: ComponentFixture<UtilityEmissionsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityEmissionsChartComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityEmissionsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
