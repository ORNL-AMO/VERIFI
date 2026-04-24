import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityStatusCheckComponent } from './facility-status-check.component';

describe('FacilityStatusCheckComponent', () => {
  let component: FacilityStatusCheckComponent;
  let fixture: ComponentFixture<FacilityStatusCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityStatusCheckComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityStatusCheckComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
