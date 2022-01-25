import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiteToSourceOptionComponent } from './site-to-source-option.component';

describe('SiteToSourceOptionComponent', () => {
  let component: SiteToSourceOptionComponent;
  let fixture: ComponentFixture<SiteToSourceOptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SiteToSourceOptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SiteToSourceOptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
