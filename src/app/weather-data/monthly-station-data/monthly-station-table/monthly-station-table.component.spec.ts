import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyStationTableComponent } from './monthly-station-table.component';

describe('MonthlyStationTableComponent', () => {
  let component: MonthlyStationTableComponent;
  let fixture: ComponentFixture<MonthlyStationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyStationTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyStationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
