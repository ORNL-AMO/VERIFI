import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityHomeHelpComponent } from './facility-home-help.component';

describe('FacilityHomeHelpComponent', () => {
  let component: FacilityHomeHelpComponent;
  let fixture: ComponentFixture<FacilityHomeHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityHomeHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacilityHomeHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
