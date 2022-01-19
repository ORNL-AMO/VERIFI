import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityAnalysisHelpComponent } from './facility-analysis-help.component';

describe('FacilityAnalysisHelpComponent', () => {
  let component: FacilityAnalysisHelpComponent;
  let fixture: ComponentFixture<FacilityAnalysisHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityAnalysisHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityAnalysisHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
