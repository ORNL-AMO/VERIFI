import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualFacilityAnalysisTableComponent } from './annual-facility-analysis-table.component';

describe('AnnualFacilityAnalysisTableComponent', () => {
  let component: AnnualFacilityAnalysisTableComponent;
  let fixture: ComponentFixture<AnnualFacilityAnalysisTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualFacilityAnalysisTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualFacilityAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
