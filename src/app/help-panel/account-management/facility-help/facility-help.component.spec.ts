import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilityHelpComponent } from './facility-help.component';

describe('FacilityHelpComponent', () => {
  let component: FacilityHelpComponent;
  let fixture: ComponentFixture<FacilityHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacilityHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilityHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
