import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, FuncResponse, FuncRequest } from '../../../services/admin-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-func-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './func-management.html'
})
export class FuncManagementComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly funcs = signal<FuncResponse[]>([]);
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

  form = { name: '', regex_pattern: '', err_message: '' };

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.funcs().filter(f => f.name.toLowerCase().includes(q));
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.api.getFuncs().subscribe({
      next: d => { this.funcs.set(d); this.isLoading.set(false); },
      error: (e) => {
        this.isLoading.set(false);
        if (e.status === 401) this.errorMsg.set('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        else this.errorMsg.set(e.error?.message || `Không thể tải danh sách func (${e.status}).`);
      }
    });
  }

  openCreate(): void {
    this.form = { name: '', regex_pattern: '', err_message: '' };
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(f: FuncResponse): void {
    this.form = { name: f.name, regex_pattern: f.regex_pattern, err_message: f.err_message };
    this.isEditing.set(true); this.editingId.set(f.id); this.showModal.set(true); this.errorMsg.set('');
  }

  save(): void {
    this.errorMsg.set('');
    if (!this.form.name.trim() || !this.form.regex_pattern.trim() || !this.form.err_message.trim()) {
      this.errorMsg.set('Vui lòng điền đầy đủ tất cả các trường!'); return;
    }
    const body: FuncRequest = { name: this.form.name.trim(), regex_pattern: this.form.regex_pattern.trim(), err_message: this.form.err_message.trim() };
    this.isSaving.set(true);
    const req = this.isEditing() ? this.api.updateFunc(this.editingId()!, body) : this.api.createFunc(body);
    req.subscribe({
      next: () => { this.showModal.set(false); this.isSaving.set(false); this.flash('Lưu thành công!'); this.load(); },
      error: (e) => { this.isSaving.set(false); this.errorMsg.set(e.error?.message || 'Lỗi khi lưu.'); }
    });
  }

  confirmDelete(id: string): void { this.deletingId.set(id); this.showConfirm.set(true); }
  doDelete(): void {
    this.api.deleteFunc(this.deletingId()!).subscribe({
      next: () => { this.showConfirm.set(false); this.flash('Đã xóa func.'); this.load(); },
      error: (e) => { this.showConfirm.set(false); this.errorMsg.set(e.error?.message || 'Không thể xóa.'); }
    });
  }
  private flash(msg: string): void { this.successMsg.set(msg); setTimeout(() => this.successMsg.set(''), 3000); }
}
