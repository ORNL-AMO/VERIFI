import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualizationBannerComponent } from './visualization-banner.component';

describe('VisualizationBannerComponent', () => {
  let component: VisualizationBannerComponent;
  let fixture: ComponentFixture<VisualizationBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VisualizationBannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VisualizationBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
