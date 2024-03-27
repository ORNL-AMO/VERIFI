import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetterClimateSetupComponent } from './better-climate-setup.component';

describe('BetterClimateSetupComponent', () => {
  let component: BetterClimateSetupComponent;
  let fixture: ComponentFixture<BetterClimateSetupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BetterClimateSetupComponent]
    });
    fixture = TestBed.createComponent(BetterClimateSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
