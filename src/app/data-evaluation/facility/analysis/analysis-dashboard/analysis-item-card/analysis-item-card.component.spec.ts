import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisItemCardComponent } from './analysis-item-card.component';

describe('AnalysisItemCardComponent', () => {
  let component: AnalysisItemCardComponent;
  let fixture: ComponentFixture<AnalysisItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisItemCardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisItemCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
