import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityListHelpComponent } from './facility-list-help.component';

describe('FacilityListHelpComponent', () => {
  let component: FacilityListHelpComponent;
  let fixture: ComponentFixture<FacilityListHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FacilityListHelpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityListHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
