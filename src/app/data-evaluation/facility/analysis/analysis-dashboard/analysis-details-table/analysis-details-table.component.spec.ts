import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisDetailsTableComponent } from './analysis-details-table.component';

describe('AnalysisDetailsTableComponent', () => {
  let component: AnalysisDetailsTableComponent;
  let fixture: ComponentFixture<AnalysisDetailsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisDetailsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisDetailsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
