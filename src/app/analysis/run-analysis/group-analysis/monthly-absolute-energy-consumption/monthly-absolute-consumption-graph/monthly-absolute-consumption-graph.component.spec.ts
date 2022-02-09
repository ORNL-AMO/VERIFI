import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAbsoluteConsumptionGraphComponent } from './monthly-absolute-consumption-graph.component';

describe('MonthlyAbsoluteConsumptionGraphComponent', () => {
  let component: MonthlyAbsoluteConsumptionGraphComponent;
  let fixture: ComponentFixture<MonthlyAbsoluteConsumptionGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAbsoluteConsumptionGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAbsoluteConsumptionGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
