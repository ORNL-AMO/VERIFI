import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisProblemsInformationComponent } from './analysis-problems-information.component';

describe('AnalysisProblemsInformationComponent', () => {
  let component: AnalysisProblemsInformationComponent;
  let fixture: ComponentFixture<AnalysisProblemsInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisProblemsInformationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisProblemsInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
