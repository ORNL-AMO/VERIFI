import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CalanderizationChartComponent } from './calanderization-chart.component';

describe('CalanderizationChartComponent', () => {
  let component: CalanderizationChartComponent;
  let fixture: ComponentFixture<CalanderizationChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CalanderizationChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CalanderizationChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
