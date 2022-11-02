import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyMetersOverviewTableComponent } from './energy-meters-overview-table.component';

describe('EnergyMetersOverviewTableComponent', () => {
  let component: EnergyMetersOverviewTableComponent;
  let fixture: ComponentFixture<EnergyMetersOverviewTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnergyMetersOverviewTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyMetersOverviewTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
