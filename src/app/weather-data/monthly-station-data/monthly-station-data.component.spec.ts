import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyStationDataComponent } from './monthly-station-data.component';

describe('MonthlyStationDataComponent', () => {
  let component: MonthlyStationDataComponent;
  let fixture: ComponentFixture<MonthlyStationDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyStationDataComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyStationDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
