import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyFootprintSidePanelComponent } from './energy-footprint-side-panel.component';

describe('EnergyFootprintSidePanelComponent', () => {
  let component: EnergyFootprintSidePanelComponent;
  let fixture: ComponentFixture<EnergyFootprintSidePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EnergyFootprintSidePanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnergyFootprintSidePanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
