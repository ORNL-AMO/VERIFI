import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyInformationTableComponent } from './company-information-table.component';

describe('CompanyInformationTableComponent', () => {
  let component: CompanyInformationTableComponent;
  let fixture: ComponentFixture<CompanyInformationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompanyInformationTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CompanyInformationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
