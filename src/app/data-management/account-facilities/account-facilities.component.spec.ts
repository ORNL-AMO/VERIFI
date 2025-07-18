import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountFacilitiesComponent } from './account-facilities.component';

describe('AccountFacilitiesComponent', () => {
  let component: AccountFacilitiesComponent;
  let fixture: ComponentFixture<AccountFacilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountFacilitiesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AccountFacilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
