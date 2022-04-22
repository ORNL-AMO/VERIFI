import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityPerformanceTableComponent } from './facility-performance-table.component';

describe('FacilityPerformanceTableComponent', () => {
  let component: FacilityPerformanceTableComponent;
  let fixture: ComponentFixture<FacilityPerformanceTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityPerformanceTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityPerformanceTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
