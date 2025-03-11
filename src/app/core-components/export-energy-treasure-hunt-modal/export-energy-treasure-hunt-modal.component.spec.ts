import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportEnergyTreasureHuntModalComponent } from './export-energy-treasure-hunt-modal.component';

describe('ExportEnergyTreasureHuntModalComponent', () => {
  let component: ExportEnergyTreasureHuntModalComponent;
  let fixture: ComponentFixture<ExportEnergyTreasureHuntModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExportEnergyTreasureHuntModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportEnergyTreasureHuntModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
