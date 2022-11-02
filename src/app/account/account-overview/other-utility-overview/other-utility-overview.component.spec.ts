import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherUtilityOverviewComponent } from './other-utility-overview.component';

describe('OtherUtilityOverviewComponent', () => {
  let component: OtherUtilityOverviewComponent;
  let fixture: ComponentFixture<OtherUtilityOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OtherUtilityOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtherUtilityOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
