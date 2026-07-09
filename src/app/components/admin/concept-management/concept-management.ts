import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ConceptResponse, ConceptRequest, TopicResponse } from '../../../services/admin-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-concept-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './concept-management.html'
})
export class ConceptManagementComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly concepts = signal<ConceptResponse[]>([]);
  readonly topics = signal<TopicResponse[]>([]);
  readonly isLoading = signal(false);
  readonly searchQuery = signal('');
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal(false);

  readonly showConfirm = signal(false);
  readonly deletingId = signal<string | null>(null);

  // Search & dropdown flags for Topics selection
  readonly topicSearchQuery = signal('');
  readonly showTopicDropdown = signal(false);

  form = { title: '', topic_ids: [] as string[], synonymsInput: '' };

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.concepts().filter(c => c.title.toLowerCase().includes(q));
  });

  // Pagination state
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly paginatedConcepts = computed(() => {
    const list = this.filtered();
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return list.slice(startIndex, startIndex + this.pageSize());
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filtered().length / this.pageSize()) || 1;
  });

  readonly pageNumbers = computed(() => {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  });

  readonly currentDisplayEndIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filtered().length);
  });

  readonly filteredTopics = computed(() => {
    const q = this.topicSearchQuery().toLowerCase().trim();
    const selected = this.form.topic_ids;
    return this.topics().filter(t =>
      !selected.includes(t.id) &&
      (t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void { 
    this.load(); 
    this.loadTopics();
  }

  load(): void {
    this.isLoading.set(true);
    this.api.getConcepts().subscribe({
      next: d => { this.concepts.set(d); this.isLoading.set(false); },
      error: (e) => {
        this.isLoading.set(false);
        if (e.status === 401) this.errorMsg.set('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        else this.errorMsg.set(e.error?.message || `Không thể tải danh sách concept (${e.status}).`);
      }
    });
  }

  loadTopics(): void {
    this.api.getTopics().subscribe({
      next: d => this.topics.set(d),
      error: e => console.error('Lỗi tải topics:', e)
    });
  }

  getTopicTitle(id: string): string {
    const topic = this.topics().find(t => t.id === id);
    return topic ? topic.title : id;
  }

  selectTopic(id: string): void {
    if (!this.form.topic_ids.includes(id)) {
      this.form.topic_ids.push(id);
    }
    this.topicSearchQuery.set('');
    this.showTopicDropdown.set(false);
  }

  removeTopic(id: string): void {
    this.form.topic_ids = this.form.topic_ids.filter(tid => tid !== id);
  }

  onTopicBlur(): void {
    setTimeout(() => this.showTopicDropdown.set(false), 200);
  }

  openCreate(): void {
    this.form = { title: '', topic_ids: [], synonymsInput: '' };
    this.topicSearchQuery.set('');
    this.showTopicDropdown.set(false);
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(c: ConceptResponse): void {
    this.form = {
      title: c.title,
      topic_ids: [...(c.topic_ids ?? [])],
      synonymsInput: (c.synonyms ?? []).join(', ')
    };
    this.topicSearchQuery.set('');
    this.showTopicDropdown.set(false);
    this.isEditing.set(true); this.editingId.set(c.id); this.showModal.set(true); this.errorMsg.set('');
  }

  parseSynonyms(): string[] {
    return this.form.synonymsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  save(): void {
    this.errorMsg.set('');
    if (!this.form.title.trim()) { this.errorMsg.set('Tiêu đề không được để trống!'); return; }
    const synonyms = this.parseSynonyms();
    if (synonyms.length === 0) { this.errorMsg.set('Phải có ít nhất 1 synonym!'); return; }
    const body: ConceptRequest = { title: this.form.title.trim(), synonyms, topic_ids: this.form.topic_ids };
    this.isSaving.set(true);
    const req = this.isEditing() ? this.api.updateConcept(this.editingId()!, body) : this.api.createConcept(body);
    req.subscribe({
      next: () => { this.showModal.set(false); this.isSaving.set(false); this.flash('Lưu thành công!'); this.load(); },
      error: (e) => { this.isSaving.set(false); this.errorMsg.set(e.error?.message || 'Lỗi khi lưu.'); }
    });
  }

  confirmDelete(id: string): void { this.deletingId.set(id); this.showConfirm.set(true); }
  doDelete(): void {
    this.api.deleteConcept(this.deletingId()!).subscribe({
      next: () => { this.showConfirm.set(false); this.flash('Đã xóa concept.'); this.load(); },
      error: (e) => { this.showConfirm.set(false); this.errorMsg.set(e.error?.message || 'Không thể xóa.'); }
    });
  }
  private flash(msg: string): void { this.successMsg.set(msg); setTimeout(() => this.successMsg.set(''), 3000); }
}
