import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorporateInformationSetupComponent } from './corporate-information-setup.component';

describe('CorporateInformationSetupComponent', () => {
  let component: CorporateInformationSetupComponent;
  let fixture: ComponentFixture<CorporateInformationSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorporateInformationSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorporateInformationSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
