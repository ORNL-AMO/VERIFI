import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterChargesVisualizationComponent } from './meter-charges-visualization.component';

describe('MeterChargesVisualizationComponent', () => {
  let component: MeterChargesVisualizationComponent;
  let fixture: ComponentFixture<MeterChargesVisualizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterChargesVisualizationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterChargesVisualizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
