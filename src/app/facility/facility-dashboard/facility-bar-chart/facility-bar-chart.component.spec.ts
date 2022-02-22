import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityBarChartComponent } from './facility-bar-chart.component';

describe('FacilityBarChartComponent', () => {
  let component: FacilityBarChartComponent;
  let fixture: ComponentFixture<FacilityBarChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FacilityBarChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityBarChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
