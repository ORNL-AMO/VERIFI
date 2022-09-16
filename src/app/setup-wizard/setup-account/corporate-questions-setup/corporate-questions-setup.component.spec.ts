import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorporateQuestionsSetupComponent } from './corporate-questions-setup.component';

describe('CorporateQuestionsSetupComponent', () => {
  let component: CorporateQuestionsSetupComponent;
  let fixture: ComponentFixture<CorporateQuestionsSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorporateQuestionsSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorporateQuestionsSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
