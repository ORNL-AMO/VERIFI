import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAccountsComponent } from './manage-accounts.component';

describe('ManageAccountsComponent', () => {
  let component: ManageAccountsComponent;
  let fixture: ComponentFixture<ManageAccountsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ManageAccountsComponent]
    });
    fixture = TestBed.createComponent(ManageAccountsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
