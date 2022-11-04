import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyUtilitiesUsageTableComponent } from './energy-utilities-usage-table.component';

describe('EnergyUtilitiesUsageTableComponent', () => {
  let component: EnergyUtilitiesUsageTableComponent;
  let fixture: ComponentFixture<EnergyUtilitiesUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyUtilitiesUsageTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyUtilitiesUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
