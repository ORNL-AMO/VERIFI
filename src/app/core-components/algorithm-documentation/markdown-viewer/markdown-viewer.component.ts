import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { docLinks } from '../docs-links';

@Component({
  selector: 'app-markdown-viewer',
  standalone: false,
  templateUrl: './markdown-viewer.component.html',
  styleUrl: './markdown-viewer.component.css'
})
export class MarkdownViewerComponent {
  page: string;

  docs = docLinks;
  currentDocTitle: string;
  constructor(private route: ActivatedRoute) {}

  get markdownSrc() {
    return `assets/docs/${this.page}.md`;
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.page = params['docId'];
      this.setCurrentDocTitle();
    });
  }

  setCurrentDocTitle() {
    let foundDoc = this.docs.find(doc => doc.link.includes(this.page));
    if (foundDoc) {
      this.currentDocTitle = foundDoc.title;
    } else {
      this.currentDocTitle = 'Documentation';
    }
  }
}
