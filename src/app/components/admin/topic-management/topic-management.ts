import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, TopicResponse, TopicRequest, ChapterResponse } from '../../../services/admin-api.service';
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
  readonly chapters = signal<ChapterResponse[]>([]);
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

  // Search & dropdown flags for Chapter selection
  readonly chapterSearchQuery = signal('');
  readonly showChapterDropdown = signal(false);

  // Form dùng snake_case để khớp request body
  form = { chapter_id: '', title: '', parent_id: '' };

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.topics().filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.chapter_id ?? '').toLowerCase().includes(q)
    );
  });

  // Pagination state
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly paginatedTopics = computed(() => {
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

  readonly filteredChapters = computed(() => {
    const q = this.chapterSearchQuery().toLowerCase().trim();
    return this.chapters().filter(c =>
      c.chapter_name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { 
    this.load(); 
    this.loadChapters();
  }

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

  loadChapters(): void {
    this.api.getChapters().subscribe({
      next: d => this.chapters.set(d),
      error: e => console.error('Lỗi tải chapters:', e)
    });
  }

  getChapterName(id: string): string {
    const chap = this.chapters().find(c => c.id === id);
    return chap ? chap.chapter_name : id;
  }

  selectChapter(chap: ChapterResponse): void {
    this.form.chapter_id = chap.id;
    this.chapterSearchQuery.set(chap.chapter_name);
    this.showChapterDropdown.set(false);
  }

  onChapterBlur(): void {
    setTimeout(() => {
      this.showChapterDropdown.set(false);
      const current = this.chapters().find(c => c.id === this.form.chapter_id);
      this.chapterSearchQuery.set(current ? current.chapter_name : '');
    }, 200);
  }

  openCreate(): void {
    this.form = { chapter_id: '', title: '', parent_id: '' };
    this.chapterSearchQuery.set('');
    this.showChapterDropdown.set(false);
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true);
    this.errorMsg.set('');
  }

  openEdit(t: TopicResponse): void {
    this.form = { chapter_id: t.chapter_id ?? '', title: t.title, parent_id: t.parent_id ?? '' };
    const chap = this.chapters().find(c => c.id === t.chapter_id);
    this.chapterSearchQuery.set(chap ? chap.chapter_name : (t.chapter_id ?? ''));
    this.showChapterDropdown.set(false);
    this.isEditing.set(true); this.editingId.set(t.id); this.showModal.set(true);
    this.errorMsg.set('');
  }

  save(): void {
    if (!this.form.title.trim() || !this.form.chapter_id.trim()) {
      this.errorMsg.set('Tiêu đề và Chapter không được để trống!'); return;
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
