import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyGroupAnalysisHelpComponent } from './monthly-group-analysis-help.component';

describe('MonthlyGroupAnalysisHelpComponent', () => {
  let component: MonthlyGroupAnalysisHelpComponent;
  let fixture: ComponentFixture<MonthlyGroupAnalysisHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyGroupAnalysisHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyGroupAnalysisHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
