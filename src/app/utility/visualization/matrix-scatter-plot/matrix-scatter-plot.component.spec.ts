import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatrixScatterPlotComponent } from './matrix-scatter-plot.component';

describe('MatrixScatterPlotComponent', () => {
  let component: MatrixScatterPlotComponent;
  let fixture: ComponentFixture<MatrixScatterPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MatrixScatterPlotComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MatrixScatterPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
