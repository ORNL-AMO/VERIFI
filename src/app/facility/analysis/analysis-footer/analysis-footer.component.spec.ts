import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisFooterComponent } from './analysis-footer.component';

describe('AnalysisFooterComponent', () => {
  let component: AnalysisFooterComponent;
  let fixture: ComponentFixture<AnalysisFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisFooterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalysisFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
