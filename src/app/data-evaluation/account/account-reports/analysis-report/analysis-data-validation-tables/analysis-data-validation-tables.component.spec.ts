import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisDataValidationTablesComponent } from './analysis-data-validation-tables.component';

describe('AnalysisDataValidationTablesComponent', () => {
  let component: AnalysisDataValidationTablesComponent;
  let fixture: ComponentFixture<AnalysisDataValidationTablesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisDataValidationTablesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisDataValidationTablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
