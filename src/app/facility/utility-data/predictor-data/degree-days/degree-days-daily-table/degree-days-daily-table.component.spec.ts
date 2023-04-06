import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DegreeDaysDailyTableComponent } from './degree-days-daily-table.component';

describe('DegreeDaysDailyTableComponent', () => {
  let component: DegreeDaysDailyTableComponent;
  let fixture: ComponentFixture<DegreeDaysDailyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DegreeDaysDailyTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DegreeDaysDailyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
