import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsConsumptionTableComponent } from './emissions-consumption-table.component';

describe('EmissionsConsumptionTableComponent', () => {
  let component: EmissionsConsumptionTableComponent;
  let fixture: ComponentFixture<EmissionsConsumptionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsConsumptionTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsConsumptionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
