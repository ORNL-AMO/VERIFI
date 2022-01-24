import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualEnergyIntensityGraphComponent } from './annual-energy-intensity-graph.component';

describe('AnnualEnergyIntensityGraphComponent', () => {
  let component: AnnualEnergyIntensityGraphComponent;
  let fixture: ComponentFixture<AnnualEnergyIntensityGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualEnergyIntensityGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualEnergyIntensityGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
