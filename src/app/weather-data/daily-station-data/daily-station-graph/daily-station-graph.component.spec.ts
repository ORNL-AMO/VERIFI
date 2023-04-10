import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyStationGraphComponent } from './daily-station-graph.component';

describe('DailyStationGraphComponent', () => {
  let component: DailyStationGraphComponent;
  let fixture: ComponentFixture<DailyStationGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DailyStationGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyStationGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
