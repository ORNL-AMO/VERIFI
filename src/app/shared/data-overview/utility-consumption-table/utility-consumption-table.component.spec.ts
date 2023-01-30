import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityConsumptionTableComponent } from './utility-consumption-table.component';

describe('UtilityConsumptionTableComponent', () => {
  let component: UtilityConsumptionTableComponent;
  let fixture: ComponentFixture<UtilityConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityConsumptionTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
