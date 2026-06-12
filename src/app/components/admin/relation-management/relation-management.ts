import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, RelationResponse, RelationRequest } from '../../../services/admin-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-relation-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './relation-management.html'
})
export class RelationManagementComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly relations = signal<RelationResponse[]>([]);
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

  form = { description: '', regex_pattern: '', err_message: '', source_id: '', target_id: '', relation_id: '' };

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.relations().filter(r =>
      r.description.toLowerCase().includes(q) ||
      (r.relation_title ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.api.getRelations().subscribe({
      next: d => { this.relations.set(d); this.isLoading.set(false); },
      error: (e) => {
        this.isLoading.set(false);
        if (e.status === 401) this.errorMsg.set('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        else this.errorMsg.set(e.error?.message || `Không thể tải danh sách relation (${e.status}).`);
      }
    });
  }

  openCreate(): void {
    this.form = { description: '', regex_pattern: '', err_message: '', source_id: '', target_id: '', relation_id: '' };
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(r: RelationResponse): void {
    this.form = {
      description: r.description, regex_pattern: r.regex_pattern, err_message: r.err_message,
      source_id: r.source_id ?? '', target_id: r.target_id ?? '', relation_id: r.relation_id ?? ''
    };
    this.isEditing.set(true); this.editingId.set(r.id); this.showModal.set(true); this.errorMsg.set('');
  }

  save(): void {
    this.errorMsg.set('');
    if (!this.form.description.trim() || !this.form.regex_pattern.trim() || !this.form.err_message.trim()) {
      this.errorMsg.set('Vui lòng điền đầy đủ các trường bắt buộc!'); return;
    }
    if (!this.form.relation_id.trim()) { this.errorMsg.set('Relation ID (nhãn quan hệ) không được để trống!'); return; }
    const body: RelationRequest = {
      description: this.form.description.trim(), regex_pattern: this.form.regex_pattern.trim(),
      err_message: this.form.err_message.trim(), relation_id: this.form.relation_id.trim(),
      source_id: this.form.source_id.trim() || undefined, target_id: this.form.target_id.trim() || undefined
    };
    this.isSaving.set(true);
    const req = this.isEditing() ? this.api.updateRelation(this.editingId()!, body) : this.api.createRelation(body);
    req.subscribe({
      next: () => { this.showModal.set(false); this.isSaving.set(false); this.flash('Lưu thành công!'); this.load(); },
      error: (e) => { this.isSaving.set(false); this.errorMsg.set(e.error?.message || 'Lỗi khi lưu.'); }
    });
  }

  confirmDelete(id: string): void { this.deletingId.set(id); this.showConfirm.set(true); }
  doDelete(): void {
    this.api.deleteRelation(this.deletingId()!).subscribe({
      next: () => { this.showConfirm.set(false); this.flash('Đã xóa relation.'); this.load(); },
      error: (e) => { this.showConfirm.set(false); this.errorMsg.set(e.error?.message || 'Không thể xóa.'); }
    });
  }
  private flash(msg: string): void { this.successMsg.set(msg); setTimeout(() => this.successMsg.set(''), 3000); }
}
