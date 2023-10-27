import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsReductionsChartComponent } from './emissions-reductions-chart.component';

describe('EmissionsReductionsChartComponent', () => {
  let component: EmissionsReductionsChartComponent;
  let fixture: ComponentFixture<EmissionsReductionsChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmissionsReductionsChartComponent]
    });
    fixture = TestBed.createComponent(EmissionsReductionsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
