import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualFacilityAnalysisGraphComponent } from './annual-facility-analysis-graph.component';

describe('AnnualFacilityAnalysisGraphComponent', () => {
  let component: AnnualFacilityAnalysisGraphComponent;
  let fixture: ComponentFixture<AnnualFacilityAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualFacilityAnalysisGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualFacilityAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
