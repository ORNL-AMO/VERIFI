import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisItemDetailsDisplayComponent } from './analysis-item-details-display.component';

describe('AnalysisItemDetailsDisplayComponent', () => {
  let component: AnalysisItemDetailsDisplayComponent;
  let fixture: ComponentFixture<AnalysisItemDetailsDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalysisItemDetailsDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisItemDetailsDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
