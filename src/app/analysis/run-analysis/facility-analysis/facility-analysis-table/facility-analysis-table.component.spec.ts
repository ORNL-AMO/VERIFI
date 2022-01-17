import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisTableComponent } from './facility-analysis-table.component';

describe('FacilityAnalysisTableComponent', () => {
  let component: FacilityAnalysisTableComponent;
  let fixture: ComponentFixture<FacilityAnalysisTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityAnalysisTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
