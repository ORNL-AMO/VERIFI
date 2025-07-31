import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityReportsTabsComponent } from './facility-reports-tabs.component';

describe('FacilityReportsTabsComponent', () => {
  let component: FacilityReportsTabsComponent;
  let fixture: ComponentFixture<FacilityReportsTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityReportsTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityReportsTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
