import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostMetersOverviewTableComponent } from './cost-meters-overview-table.component';

describe('CostMetersOverviewTableComponent', () => {
  let component: CostMetersOverviewTableComponent;
  let fixture: ComponentFixture<CostMetersOverviewTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostMetersOverviewTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostMetersOverviewTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
