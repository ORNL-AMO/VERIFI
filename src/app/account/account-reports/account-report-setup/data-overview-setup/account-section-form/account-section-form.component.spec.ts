import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSectionFormComponent } from './account-section-form.component';

describe('AccountSectionFormComponent', () => {
  let component: AccountSectionFormComponent;
  let fixture: ComponentFixture<AccountSectionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountSectionFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSectionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
