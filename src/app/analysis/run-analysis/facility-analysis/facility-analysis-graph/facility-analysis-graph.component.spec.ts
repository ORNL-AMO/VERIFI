import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisGraphComponent } from './facility-analysis-graph.component';

describe('FacilityAnalysisGraphComponent', () => {
  let component: FacilityAnalysisGraphComponent;
  let fixture: ComponentFixture<FacilityAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityAnalysisGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
