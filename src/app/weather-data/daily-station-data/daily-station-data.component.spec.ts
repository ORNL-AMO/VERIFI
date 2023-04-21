import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyStationDataComponent } from './daily-station-data.component';

describe('DailyStationDataComponent', () => {
  let component: DailyStationDataComponent;
  let fixture: ComponentFixture<DailyStationDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DailyStationDataComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyStationDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
