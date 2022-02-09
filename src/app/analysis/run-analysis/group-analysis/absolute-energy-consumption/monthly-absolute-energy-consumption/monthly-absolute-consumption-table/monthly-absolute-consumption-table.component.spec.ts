import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAbsoluteConsumptionTableComponent } from './monthly-absolute-consumption-table.component';

describe('MonthlyAbsoluteConsumptionTableComponent', () => {
  let component: MonthlyAbsoluteConsumptionTableComponent;
  let fixture: ComponentFixture<MonthlyAbsoluteConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAbsoluteConsumptionTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAbsoluteConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
