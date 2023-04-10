import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyStationTableComponent } from './daily-station-table.component';

describe('DailyStationTableComponent', () => {
  let component: DailyStationTableComponent;
  let fixture: ComponentFixture<DailyStationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DailyStationTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyStationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
