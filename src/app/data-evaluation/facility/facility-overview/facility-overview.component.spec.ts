import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityOverviewComponent } from './facility-overview.component';

describe('FacilityOverviewComponent', () => {
  let component: FacilityOverviewComponent;
  let fixture: ComponentFixture<FacilityOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
