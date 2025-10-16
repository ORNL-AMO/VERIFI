import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisHideDetailsTableComponent } from './analysis-hide-details-table.component';

describe('AnalysisHideDetailsTableComponent', () => {
  let component: AnalysisHideDetailsTableComponent;
  let fixture: ComponentFixture<AnalysisHideDetailsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisHideDetailsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisHideDetailsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
