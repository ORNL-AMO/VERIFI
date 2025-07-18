import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityUtilityHelpComponent } from './facility-utility-help.component';

describe('FacilityUtilityHelpComponent', () => {
  let component: FacilityUtilityHelpComponent;
  let fixture: ComponentFixture<FacilityUtilityHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityUtilityHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityUtilityHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
