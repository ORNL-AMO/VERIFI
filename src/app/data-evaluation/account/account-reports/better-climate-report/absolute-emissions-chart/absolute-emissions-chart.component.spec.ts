import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsoluteEmissionsChartComponent } from './absolute-emissions-chart.component';

describe('AbsoluteEmissionsChartComponent', () => {
  let component: AbsoluteEmissionsChartComponent;
  let fixture: ComponentFixture<AbsoluteEmissionsChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AbsoluteEmissionsChartComponent]
    });
    fixture = TestBed.createComponent(AbsoluteEmissionsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
