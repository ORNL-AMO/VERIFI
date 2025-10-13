import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualAnalysisGroupSavingsTableComponent } from './annual-analysis-group-savings-table.component';

describe('AnnualAnalysisGroupSavingsTableComponent', () => {
  let component: AnnualAnalysisGroupSavingsTableComponent;
  let fixture: ComponentFixture<AnnualAnalysisGroupSavingsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnnualAnalysisGroupSavingsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualAnalysisGroupSavingsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
