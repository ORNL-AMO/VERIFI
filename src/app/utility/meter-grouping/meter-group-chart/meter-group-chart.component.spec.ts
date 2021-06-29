import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterGroupChartComponent } from './meter-group-chart.component';

describe('MeterGroupChartComponent', () => {
  let component: MeterGroupChartComponent;
  let fixture: ComponentFixture<MeterGroupChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeterGroupChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MeterGroupChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
