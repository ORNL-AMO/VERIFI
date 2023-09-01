import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarbonSetupComponent } from './carbon-setup.component';

describe('CarbonSetupComponent', () => {
  let component: CarbonSetupComponent;
  let fixture: ComponentFixture<CarbonSetupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CarbonSetupComponent]
    });
    fixture = TestBed.createComponent(CarbonSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
