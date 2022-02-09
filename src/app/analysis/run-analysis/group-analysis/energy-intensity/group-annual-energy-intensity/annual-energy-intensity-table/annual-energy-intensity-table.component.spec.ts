import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualEnergyIntensityTableComponent } from './annual-energy-intensity-table.component';

describe('AnnualEnergyIntensityTableComponent', () => {
  let component: AnnualEnergyIntensityTableComponent;
  let fixture: ComponentFixture<AnnualEnergyIntensityTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualEnergyIntensityTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualEnergyIntensityTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
