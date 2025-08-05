import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrelationPlotMenuComponent } from './correlation-plot-menu.component';

describe('CorrelationPlotMenuComponent', () => {
  let component: CorrelationPlotMenuComponent;
  let fixture: ComponentFixture<CorrelationPlotMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorrelationPlotMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorrelationPlotMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
