import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisComponent } from './facility-analysis.component';

describe('FacilityAnalysisComponent', () => {
  let component: FacilityAnalysisComponent;
  let fixture: ComponentFixture<FacilityAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
