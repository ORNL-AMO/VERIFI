import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterUsageTableComponent } from './meter-usage-table.component';

describe('MeterUsageTableComponent', () => {
  let component: MeterUsageTableComponent;
  let fixture: ComponentFixture<MeterUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeterUsageTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
