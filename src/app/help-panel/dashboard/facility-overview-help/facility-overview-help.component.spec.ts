import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityOverviewHelpComponent } from './facility-overview-help.component';

describe('FacilityOverviewHelpComponent', () => {
  let component: FacilityOverviewHelpComponent;
  let fixture: ComponentFixture<FacilityOverviewHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityOverviewHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityOverviewHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
