import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimaryWaterConsumptionTableComponent } from './primary-water-consumption-table.component';

describe('PrimaryWaterConsumptionTableComponent', () => {
  let component: PrimaryWaterConsumptionTableComponent;
  let fixture: ComponentFixture<PrimaryWaterConsumptionTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PrimaryWaterConsumptionTableComponent]
    });
    fixture = TestBed.createComponent(PrimaryWaterConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
