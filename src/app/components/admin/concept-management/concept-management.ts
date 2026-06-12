import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ConceptResponse, ConceptRequest } from '../../../services/admin-api.service';
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

  form = { title: '', topic_ids: '', synonymsInput: '' };

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.concepts().filter(c => c.title.toLowerCase().includes(q));
  });

  ngOnInit(): void { this.load(); }

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

  openCreate(): void {
    this.form = { title: '', topic_ids: '', synonymsInput: '' };
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(c: ConceptResponse): void {
    this.form = {
      title: c.title,
      topic_ids: (c.topic_ids ?? []).join(', '),
      synonymsInput: (c.synonyms ?? []).join(', ')
    };
    this.isEditing.set(true); this.editingId.set(c.id); this.showModal.set(true); this.errorMsg.set('');
  }

  parseSynonyms(): string[] {
    return this.form.synonymsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  parseTopicIds(): string[] {
    return this.form.topic_ids.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  save(): void {
    this.errorMsg.set('');
    if (!this.form.title.trim()) { this.errorMsg.set('Tiêu đề không được để trống!'); return; }
    const synonyms = this.parseSynonyms();
    if (synonyms.length === 0) { this.errorMsg.set('Phải có ít nhất 1 synonym!'); return; }
    const body: ConceptRequest = { title: this.form.title.trim(), synonyms, topic_ids: this.parseTopicIds() };
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
