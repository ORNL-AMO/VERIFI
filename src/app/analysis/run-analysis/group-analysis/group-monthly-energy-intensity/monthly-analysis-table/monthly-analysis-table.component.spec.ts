import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAnalysisTableComponent } from './monthly-analysis-table.component';

describe('MonthlyAnalysisTableComponent', () => {
  let component: MonthlyAnalysisTableComponent;
  let fixture: ComponentFixture<MonthlyAnalysisTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAnalysisTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
