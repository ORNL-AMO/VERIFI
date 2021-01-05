import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityStackedAreaChartComponent } from './facility-stacked-area-chart.component';

describe('FacilityStackedAreaChartComponent', () => {
  let component: FacilityStackedAreaChartComponent;
  let fixture: ComponentFixture<FacilityStackedAreaChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FacilityStackedAreaChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityStackedAreaChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
