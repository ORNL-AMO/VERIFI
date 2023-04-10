import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyStationGraphComponent } from './monthly-station-graph.component';

describe('MonthlyStationGraphComponent', () => {
  let component: MonthlyStationGraphComponent;
  let fixture: ComponentFixture<MonthlyStationGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyStationGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyStationGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
