import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisBannerComponent } from './analysis-banner.component';

describe('AnalysisBannerComponent', () => {
  let component: AnalysisBannerComponent;
  let fixture: ComponentFixture<AnalysisBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
