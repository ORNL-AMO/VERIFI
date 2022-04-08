import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualizationHelpComponent } from './visualization-help.component';

describe('VisualizationHelpComponent', () => {
  let component: VisualizationHelpComponent;
  let fixture: ComponentFixture<VisualizationHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VisualizationHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VisualizationHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
