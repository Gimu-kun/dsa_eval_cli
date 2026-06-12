import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, RubricResponse, RubricRequest } from '../../../services/admin-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-rubric-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './rubric-management.html'
})
export class RubricManagementComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly rubrics = signal<RubricResponse[]>([]);
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

  form = { description: '', acc_w: 0.4, comp_w: 0.3, log_w: 0.3 };

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.rubrics().filter(r => r.description.toLowerCase().includes(q));
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.api.getRubrics().subscribe({
      next: data => { this.rubrics.set(data); this.isLoading.set(false); },
      error: (e) => {
        this.isLoading.set(false);
        if (e.status === 401) this.errorMsg.set('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        else this.errorMsg.set(e.error?.message || `Không thể tải danh sách rubric (${e.status}).`);
      }
    });
  }

  openCreate(): void {
    this.form = { description: '', acc_w: 0.4, comp_w: 0.3, log_w: 0.3 };
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(r: RubricResponse): void {
    this.form = { description: r.description, acc_w: r.acc_w, comp_w: r.comp_w, log_w: r.log_w };
    this.isEditing.set(true); this.editingId.set(r.id); this.showModal.set(true); this.errorMsg.set('');
  }

  get totalWeight(): number { return Math.round((this.form.acc_w + this.form.comp_w + this.form.log_w) * 100) / 100; }

  save(): void {
    if (!this.form.description.trim()) { this.errorMsg.set('Mô tả không được để trống!'); return; }
    if (Math.abs(this.totalWeight - 1.0) >= 0.0001) { this.errorMsg.set(`Tổng trọng số phải bằng 1.0 (hiện: ${this.totalWeight})`); return; }
    const body: RubricRequest = { description: this.form.description.trim(), acc_w: this.form.acc_w, comp_w: this.form.comp_w, log_w: this.form.log_w };
    this.isSaving.set(true);
    const req = this.isEditing() ? this.api.updateRubric(this.editingId()!, body) : this.api.createRubric(body);
    req.subscribe({
      next: () => { this.showModal.set(false); this.isSaving.set(false); this.flash('Lưu thành công!'); this.load(); },
      error: (e) => { this.isSaving.set(false); this.errorMsg.set(e.error?.message || 'Lỗi khi lưu.'); }
    });
  }

  confirmDelete(id: string): void { this.deletingId.set(id); this.showConfirm.set(true); }
  doDelete(): void {
    this.api.deleteRubric(this.deletingId()!).subscribe({
      next: () => { this.showConfirm.set(false); this.flash('Đã xóa.'); this.load(); },
      error: (e) => { this.showConfirm.set(false); this.errorMsg.set(e.error?.message || 'Không thể xóa.'); }
    });
  }
  private flash(msg: string): void { this.successMsg.set(msg); setTimeout(() => this.successMsg.set(''), 3000); }
}
