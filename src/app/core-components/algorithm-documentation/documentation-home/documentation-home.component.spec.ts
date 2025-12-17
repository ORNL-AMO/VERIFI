import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentationHomeComponent } from './documentation-home.component';

describe('DocumentationHomeComponent', () => {
  let component: DocumentationHomeComponent;
  let fixture: ComponentFixture<DocumentationHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DocumentationHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentationHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
