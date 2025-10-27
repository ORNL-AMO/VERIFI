import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisDetailItemCardComponent } from './analysis-detail-item-card.component';

describe('AnalysisDetailItemCardComponent', () => {
  let component: AnalysisDetailItemCardComponent;
  let fixture: ComponentFixture<AnalysisDetailItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisDetailItemCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisDetailItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
