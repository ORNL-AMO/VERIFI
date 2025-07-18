import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityVisualizationHelpComponent } from './facility-visualization-help.component';

describe('FacilityVisualizationHelpComponent', () => {
  let component: FacilityVisualizationHelpComponent;
  let fixture: ComponentFixture<FacilityVisualizationHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityVisualizationHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityVisualizationHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
