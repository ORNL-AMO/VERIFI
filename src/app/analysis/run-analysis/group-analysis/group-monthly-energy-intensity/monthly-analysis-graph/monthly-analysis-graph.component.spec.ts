import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAnalysisGraphComponent } from './monthly-analysis-graph.component';

describe('MonthlyAnalysisGraphComponent', () => {
  let component: MonthlyAnalysisGraphComponent;
  let fixture: ComponentFixture<MonthlyAnalysisGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAnalysisGraphComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAnalysisGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
