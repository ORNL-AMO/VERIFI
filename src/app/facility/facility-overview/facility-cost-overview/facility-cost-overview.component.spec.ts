import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityCostOverviewComponent } from './facility-cost-overview.component';

describe('FacilityCostOverviewComponent', () => {
  let component: FacilityCostOverviewComponent;
  let fixture: ComponentFixture<FacilityCostOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityCostOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityCostOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
