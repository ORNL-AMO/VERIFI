import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorporateUnitsSetupComponent } from './corporate-units-setup.component';

describe('CorporateUnitsSetupComponent', () => {
  let component: CorporateUnitsSetupComponent;
  let fixture: ComponentFixture<CorporateUnitsSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorporateUnitsSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorporateUnitsSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
