import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualAnalysisGroupSavingsGraphComponent } from './annual-analysis-group-savings-graph.component';

describe('AnnualAnalysisGroupSavingsGraphComponent', () => {
  let component: AnnualAnalysisGroupSavingsGraphComponent;
  let fixture: ComponentFixture<AnnualAnalysisGroupSavingsGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualAnalysisGroupSavingsGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualAnalysisGroupSavingsGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
