import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, RelationResponse, RelationRequest, ConceptResponse } from '../../../services/admin-api.service';
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

  // Search & dropdown flags for Source, Target, and Relation concept fields
  readonly sourceSearchQuery = signal('');
  readonly showSourceDropdown = signal(false);

  readonly targetSearchQuery = signal('');
  readonly showTargetDropdown = signal(false);

  readonly relationSearchQuery = signal('');
  readonly showRelationDropdown = signal(false);

  readonly conceptSearchQuery = signal('');
  readonly showConceptDropdown = signal(false);
  readonly selectedConcepts = signal<ConceptResponse[]>([]);

  form = { description: '', regex_pattern: '', err_message: '', source_id: '', target_id: '', relation_id: '' };
  
  readonly selectedSources = signal<ConceptResponse[]>([]);
  readonly selectedTargets = signal<ConceptResponse[]>([]);
  readonly sourceOperator = signal<'AND' | 'OR'>('OR');
  readonly targetOperator = signal<'AND' | 'OR'>('OR');

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.relations().filter(r =>
      r.description.toLowerCase().includes(q) ||
      (r.relation_title ?? '').toLowerCase().includes(q)
    );
  });

  // Pagination state
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly paginatedRelations = computed(() => {
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

  readonly filteredSourceConcepts = computed(() => {
    const q = this.sourceSearchQuery().toLowerCase().trim();
    return this.concepts().filter(c =>
      c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  });

  readonly filteredTargetConcepts = computed(() => {
    const q = this.targetSearchQuery().toLowerCase().trim();
    return this.concepts().filter(c =>
      c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  });

  readonly filteredRelationConcepts = computed(() => {
    const q = this.relationSearchQuery().toLowerCase().trim();
    return this.concepts().filter(c =>
      c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  });

  readonly filteredConcepts = computed(() => {
    const q = this.conceptSearchQuery().toLowerCase().trim();
    const selected = this.selectedConcepts().map(x => x.id);
    return this.concepts().filter(c =>
      !selected.includes(c.id) &&
      (c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void { 
    this.load(); 
    this.loadConcepts();
  }

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

  loadConcepts(): void {
    this.api.getConcepts().subscribe({
      next: d => this.concepts.set(d),
      error: e => console.error('Lỗi tải concepts:', e)
    });
  }

  getConceptTitle(id: string): string {
    const concept = this.concepts().find(c => c.id === id);
    return concept ? concept.title : id;
  }

  formatConcepts(concepts: ConceptResponse[] | undefined, operator: string | undefined, legacyId?: string, legacyTitle?: string): string {
    if (concepts && concepts.length > 0) {
      const joinWord = operator === 'AND' ? '&' : '|';
      return concepts.map(c => c.title).join(joinWord);
    }
    return legacyTitle || legacyId || '—';
  }

  selectSource(c: ConceptResponse): void {
    if (!this.selectedSources().some(s => s.id === c.id)) {
      this.selectedSources.update(curr => [...curr, c]);
    }
    this.sourceSearchQuery.set('');
    this.showSourceDropdown.set(false);
  }

  removeSource(c: ConceptResponse): void {
    this.selectedSources.update(curr => curr.filter(s => s.id !== c.id));
  }

  onSourceBlur(): void {
    setTimeout(() => {
      this.showSourceDropdown.set(false);
      this.sourceSearchQuery.set('');
    }, 200);
  }

  selectTarget(c: ConceptResponse): void {
    if (!this.selectedTargets().some(t => t.id === c.id)) {
      this.selectedTargets.update(curr => [...curr, c]);
    }
    this.targetSearchQuery.set('');
    this.showTargetDropdown.set(false);
  }

  removeTarget(c: ConceptResponse): void {
    this.selectedTargets.update(curr => curr.filter(t => t.id !== c.id));
  }

  onTargetBlur(): void {
    setTimeout(() => {
      this.showTargetDropdown.set(false);
      this.targetSearchQuery.set('');
    }, 200);
  }

  selectRelation(c: ConceptResponse): void {
    this.form.relation_id = c.id;
    this.relationSearchQuery.set(c.title);
    this.showRelationDropdown.set(false);
  }

  onRelationBlur(): void {
    setTimeout(() => {
      this.showRelationDropdown.set(false);
      const current = this.concepts().find(c => c.id === this.form.relation_id);
      this.relationSearchQuery.set(current ? current.title : '');
    }, 200);
  }

  selectConcept(c: ConceptResponse): void {
    if (!this.selectedConcepts().some(x => x.id === c.id)) {
      this.selectedConcepts.update(curr => [...curr, c]);
    }
    this.conceptSearchQuery.set('');
    this.showConceptDropdown.set(false);
  }

  removeConcept(c: ConceptResponse): void {
    this.selectedConcepts.update(curr => curr.filter(x => x.id !== c.id));
  }

  onConceptBlur(): void {
    setTimeout(() => {
      this.showConceptDropdown.set(false);
      this.conceptSearchQuery.set('');
    }, 200);
  }

  openCreate(): void {
    this.form = { description: '', regex_pattern: '', err_message: '', source_id: '', target_id: '', relation_id: '' };
    this.selectedSources.set([]);
    this.selectedTargets.set([]);
    this.selectedConcepts.set([]);
    this.sourceOperator.set('OR');
    this.targetOperator.set('OR');
    this.sourceSearchQuery.set('');
    this.targetSearchQuery.set('');
    this.relationSearchQuery.set('');
    this.conceptSearchQuery.set('');
    this.showSourceDropdown.set(false);
    this.showTargetDropdown.set(false);
    this.showRelationDropdown.set(false);
    this.showConceptDropdown.set(false);
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(r: RelationResponse): void {
    this.form = {
      description: r.description, regex_pattern: r.regex_pattern, err_message: r.err_message,
      source_id: r.source_id ?? '', target_id: r.target_id ?? '', relation_id: r.relation_id ?? ''
    };
    
    if (r.source_concepts) {
      this.selectedSources.set(r.source_concepts);
    } else if (r.source_id) {
      const src = this.concepts().find(c => c.id === r.source_id);
      this.selectedSources.set(src ? [src] : []);
    } else {
      this.selectedSources.set([]);
    }

    if (r.target_concepts) {
      this.selectedTargets.set(r.target_concepts);
    } else if (r.target_id) {
      const tgt = this.concepts().find(c => c.id === r.target_id);
      this.selectedTargets.set(tgt ? [tgt] : []);
    } else {
      this.selectedTargets.set([]);
    }

    if (r.concepts) {
      this.selectedConcepts.set(r.concepts);
    } else {
      this.selectedConcepts.set([]);
    }

    this.sourceOperator.set((r.source_operator as 'AND' | 'OR') || 'OR');
    this.targetOperator.set((r.target_operator as 'AND' | 'OR') || 'OR');

    this.sourceSearchQuery.set('');
    this.targetSearchQuery.set('');
    this.conceptSearchQuery.set('');

    const rel = this.concepts().find(c => c.id === r.relation_id);
    this.relationSearchQuery.set(rel ? rel.title : (r.relation_id ?? ''));

    this.showSourceDropdown.set(false);
    this.showTargetDropdown.set(false);
    this.showRelationDropdown.set(false);
    this.showConceptDropdown.set(false);
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
      source_ids: this.selectedSources().map(s => s.id),
      source_operator: this.sourceOperator(),
      target_ids: this.selectedTargets().map(t => t.id),
      target_operator: this.targetOperator(),
      concept_ids: this.selectedConcepts().map(x => x.id)
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
