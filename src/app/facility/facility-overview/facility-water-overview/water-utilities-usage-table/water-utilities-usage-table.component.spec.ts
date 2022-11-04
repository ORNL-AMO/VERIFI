import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterUtilitiesUsageTableComponent } from './water-utilities-usage-table.component';

describe('WaterUtilitiesUsageTableComponent', () => {
  let component: WaterUtilitiesUsageTableComponent;
  let fixture: ComponentFixture<WaterUtilitiesUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WaterUtilitiesUsageTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterUtilitiesUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
