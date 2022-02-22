import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyFacilityAnalysisGraphComponent } from './monthly-facility-analysis-graph.component';

describe('MonthlyFacilityAnalysisGraphComponent', () => {
  let component: MonthlyFacilityAnalysisGraphComponent;
  let fixture: ComponentFixture<MonthlyFacilityAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyFacilityAnalysisGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyFacilityAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
