import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DegreeDaysHourlyGraphComponent } from './degree-days-hourly-graph.component';

describe('DegreeDaysHourlyGraphComponent', () => {
  let component: DegreeDaysHourlyGraphComponent;
  let fixture: ComponentFixture<DegreeDaysHourlyGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DegreeDaysHourlyGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DegreeDaysHourlyGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
