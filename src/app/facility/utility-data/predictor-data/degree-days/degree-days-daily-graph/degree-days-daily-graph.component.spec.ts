import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DegreeDaysDailyGraphComponent } from './degree-days-daily-graph.component';

describe('DegreeDaysDailyGraphComponent', () => {
  let component: DegreeDaysDailyGraphComponent;
  let fixture: ComponentFixture<DegreeDaysDailyGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DegreeDaysDailyGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DegreeDaysDailyGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
