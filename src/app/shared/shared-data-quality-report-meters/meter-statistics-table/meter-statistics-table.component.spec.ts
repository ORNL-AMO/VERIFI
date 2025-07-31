import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterStatisticsTableComponent } from './meter-statistics-table.component';

describe('MeterStatisticsTableComponent', () => {
  let component: MeterStatisticsTableComponent;
  let fixture: ComponentFixture<MeterStatisticsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterStatisticsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterStatisticsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
