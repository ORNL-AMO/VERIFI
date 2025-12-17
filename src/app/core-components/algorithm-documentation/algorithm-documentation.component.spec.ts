import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlgorithmDocumentationComponent } from './algorithm-documentation.component';

describe('AlgorithmDocumentationComponent', () => {
  let component: AlgorithmDocumentationComponent;
  let fixture: ComponentFixture<AlgorithmDocumentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlgorithmDocumentationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlgorithmDocumentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
