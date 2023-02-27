import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterConsumptionTableComponent } from './water-consumption-table.component';

describe('WaterConsumptionTableComponent', () => {
  let component: WaterConsumptionTableComponent;
  let fixture: ComponentFixture<WaterConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WaterConsumptionTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
