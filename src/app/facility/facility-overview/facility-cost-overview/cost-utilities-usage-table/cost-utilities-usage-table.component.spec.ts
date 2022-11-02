import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostUtilitiesUsageTableComponent } from './cost-utilities-usage-table.component';

describe('CostUtilitiesUsageTableComponent', () => {
  let component: CostUtilitiesUsageTableComponent;
  let fixture: ComponentFixture<CostUtilitiesUsageTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostUtilitiesUsageTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostUtilitiesUsageTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
