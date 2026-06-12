import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, TopicResponse, TopicRequest } from '../../../services/admin-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-topic-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './topic-management.html'
})
export class TopicManagementComponent implements OnInit {
  private readonly api = inject(AdminApiService);

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

  // Form dùng snake_case để khớp request body
  form = { chapter_id: '', title: '', parent_id: '' };

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.topics().filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.chapter_id ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.errorMsg.set('');
    this.api.getTopics().subscribe({
      next: data => { 
        console.log(data);
        this.topics.set(data); 
        this.isLoading.set(false); },
      error: (e) => {
        this.isLoading.set(false);
        if (e.status === 401) this.errorMsg.set('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        else this.errorMsg.set(e.error?.message || `Không thể tải danh sách topic (${e.status}).`);
      }
    });
  }

  openCreate(): void {
    this.form = { chapter_id: '', title: '', parent_id: '' };
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true);
    this.errorMsg.set('');
  }

  openEdit(t: TopicResponse): void {
    this.form = { chapter_id: t.chapter_id ?? '', title: t.title, parent_id: t.parent_id ?? '' };
    this.isEditing.set(true); this.editingId.set(t.id); this.showModal.set(true);
    this.errorMsg.set('');
  }

  save(): void {
    if (!this.form.title.trim() || !this.form.chapter_id.trim()) {
      this.errorMsg.set('Tiêu đề và Chapter ID không được để trống!'); return;
    }
    const body: TopicRequest = {
      chapter_id: this.form.chapter_id.trim(),
      title: this.form.title.trim(),
      parent_id: this.form.parent_id.trim() || undefined
    };
    this.isSaving.set(true);
    const req = this.isEditing() ? this.api.updateTopic(this.editingId()!, body) : this.api.createTopic(body);
    req.subscribe({
      next: () => { this.showModal.set(false); this.isSaving.set(false); this.flash('Lưu thành công!'); this.load(); },
      error: (e) => { this.isSaving.set(false); this.errorMsg.set(e.error?.message || 'Lỗi khi lưu.'); }
    });
  }

  confirmDelete(id: string): void { this.deletingId.set(id); this.showConfirm.set(true); }

  doDelete(): void {
    this.api.deleteTopic(this.deletingId()!).subscribe({
      next: () => { this.showConfirm.set(false); this.flash('Đã xóa topic.'); this.load(); },
      error: (e) => { this.showConfirm.set(false); this.errorMsg.set(e.error?.message || 'Không thể xóa.'); }
    });
  }

  private flash(msg: string): void { this.successMsg.set(msg); setTimeout(() => this.successMsg.set(''), 3000); }
}
