import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualFacilityAnalysisComponent } from './annual-facility-analysis.component';

describe('AnnualFacilityAnalysisComponent', () => {
  let component: AnnualFacilityAnalysisComponent;
  let fixture: ComponentFixture<AnnualFacilityAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualFacilityAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualFacilityAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
