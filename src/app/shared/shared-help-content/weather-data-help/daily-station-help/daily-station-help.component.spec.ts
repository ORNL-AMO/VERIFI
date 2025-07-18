import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyStationHelpComponent } from './daily-station-help.component';

describe('DailyStationHelpComponent', () => {
  let component: DailyStationHelpComponent;
  let fixture: ComponentFixture<DailyStationHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DailyStationHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyStationHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
