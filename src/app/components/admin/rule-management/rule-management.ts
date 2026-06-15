import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, RuleResponse, RuleRequest, OrderedStep, ConceptResponse, RelationResponse } from '../../../services/admin-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';

type RuleType = 'SYN' | 'ORD' | 'COD';

@Component({
  selector: 'app-rule-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './rule-management.html'
})
export class RuleManagementComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly rules = signal<RuleResponse[]>([]);
  readonly concepts = signal<ConceptResponse[]>([]);
  readonly relations = signal<RelationResponse[]>([]);
  readonly isLoading = signal(false);
  readonly searchQuery = signal('');
  readonly filterType = signal<RuleType | ''>('');
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal(false);

  readonly showConfirm = signal(false);
  readonly deletingId = signal<string | null>(null);

  // Search & dropdown flags for Concept & Relation multi-selections
  readonly conceptSearchQuery = signal('');
  readonly showConceptDropdown = signal(false);

  readonly relationSearchQuery = signal('');
  readonly showRelationDropdown = signal(false);

  // Form – dùng snake_case để khớp với DTO
  form = { name: '', err_message: '', type: 'SYN' as RuleType };
  // SYN - store as arrays of strings directly
  synForm = { concept_ids: [] as string[], relation_ids: [] as string[] };
  // ORD
  ordSteps: { description: string; rule_ids: string }[] = [{ description: '', rule_ids: '' }];
  // COD
  codAst = '';

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const t = this.filterType();
    return this.rules().filter(r =>
      (!t || r.type === t) && r.name.toLowerCase().includes(q)
    );
  });

  readonly filteredConcepts = computed(() => {
    const q = this.conceptSearchQuery().toLowerCase().trim();
    const selected = this.synForm.concept_ids;
    return this.concepts().filter(c =>
      !selected.includes(c.id) &&
      (c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
    );
  });

  readonly filteredRelations = computed(() => {
    const q = this.relationSearchQuery().toLowerCase().trim();
    const selected = this.synForm.relation_ids;
    return this.relations().filter(r =>
      !selected.includes(r.id) &&
      (r.description.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
    );
  });

  typeColors: Record<RuleType, string> = {
    SYN: 'bg-blue-100 text-blue-700',
    ORD: 'bg-amber-100 text-amber-700',
    COD: 'bg-purple-100 text-purple-700'
  };

  ngOnInit(): void { 
    this.load(); 
    this.loadConcepts();
    this.loadRelations();
  }

  load(): void {
    this.isLoading.set(true);
    this.api.getRules().subscribe({
      next: d => { this.rules.set(d); this.isLoading.set(false); },
      error: (e) => {
        this.isLoading.set(false);
        if (e.status === 401) this.errorMsg.set('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        else this.errorMsg.set(e.error?.message || `Không thể tải danh sách rule (${e.status}).`);
      }
    });
  }

  loadConcepts(): void {
    this.api.getConcepts().subscribe({
      next: d => this.concepts.set(d),
      error: e => console.error('Lỗi tải concepts:', e)
    });
  }

  loadRelations(): void {
    this.api.getRelations().subscribe({
      next: d => this.relations.set(d),
      error: e => console.error('Lỗi tải relations:', e)
    });
  }

  getConceptTitle(id: string): string {
    const concept = this.concepts().find(c => c.id === id);
    return concept ? concept.title : id;
  }

  getRelationTitle(id: string): string {
    const rel = this.relations().find(r => r.id === id);
    return rel ? rel.description : id;
  }

  selectConcept(id: string): void {
    if (!this.synForm.concept_ids.includes(id)) {
      this.synForm.concept_ids.push(id);
    }
    this.conceptSearchQuery.set('');
    this.showConceptDropdown.set(false);
  }

  removeConcept(id: string): void {
    this.synForm.concept_ids = this.synForm.concept_ids.filter(cid => cid !== id);
  }

  onConceptBlur(): void {
    setTimeout(() => this.showConceptDropdown.set(false), 200);
  }

  selectRelation(id: string): void {
    if (!this.synForm.relation_ids.includes(id)) {
      this.synForm.relation_ids.push(id);
    }
    this.relationSearchQuery.set('');
    this.showRelationDropdown.set(false);
  }

  removeRelation(id: string): void {
    this.synForm.relation_ids = this.synForm.relation_ids.filter(rid => rid !== id);
  }

  onRelationBlur(): void {
    setTimeout(() => this.showRelationDropdown.set(false), 200);
  }

  openCreate(): void {
    this.form = { name: '', err_message: '', type: 'SYN' };
    this.synForm = { concept_ids: [], relation_ids: [] };
    this.ordSteps = [{ description: '', rule_ids: '' }];
    this.codAst = '';
    this.conceptSearchQuery.set('');
    this.relationSearchQuery.set('');
    this.showConceptDropdown.set(false);
    this.showRelationDropdown.set(false);
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(r: RuleResponse): void {
    this.form = { name: r.name, err_message: r.err_message, type: r.type };
    this.synForm = {
      concept_ids: [...(r.concept_ids ?? [])],
      relation_ids: [...(r.relation_ids ?? [])]
    };
    this.ordSteps = (r.ordered_steps ?? [{ step_order: 1, description: '', rule_ids: [] }])
      .map((s: OrderedStep) => ({ description: s.description, rule_ids: s.rule_ids.join(', ') }));
    this.codAst = r.code_ast ? JSON.stringify(r.code_ast, null, 2) : '';
    this.conceptSearchQuery.set('');
    this.relationSearchQuery.set('');
    this.showConceptDropdown.set(false);
    this.showRelationDropdown.set(false);
    this.isEditing.set(true); this.editingId.set(r.id); this.showModal.set(true); this.errorMsg.set('');
  }

  addStep(): void { this.ordSteps.push({ description: '', rule_ids: '' }); }
  removeStep(i: number): void { this.ordSteps.splice(i, 1); }

  save(): void {
    this.errorMsg.set('');
    if (!this.form.name.trim() || !this.form.err_message.trim()) {
      this.errorMsg.set('Tên và thông báo lỗi không được để trống!'); return;
    }
    const body: RuleRequest = {
      name: this.form.name.trim(),
      err_message: this.form.err_message.trim(),
      type: this.form.type
    };

    if (this.form.type === 'SYN') {
      body.concept_ids = this.synForm.concept_ids;
      body.relation_ids = this.synForm.relation_ids;
    } else if (this.form.type === 'ORD') {
      if (!this.ordSteps.some(s => s.description.trim())) { this.errorMsg.set('Phải có ít nhất 1 bước!'); return; }
      body.ordered_steps = this.ordSteps.map((s, i): OrderedStep => ({
        step_order: i + 1,
        description: s.description.trim(),
        rule_ids: s.rule_ids.split(',').map(r => r.trim()).filter(Boolean)
      }));
    } else if (this.form.type === 'COD') {
      if (!this.codAst.trim()) { this.errorMsg.set('Cây AST (code_ast) không được để trống!'); return; }
      try { body.code_ast = JSON.parse(this.codAst); }
      catch { this.errorMsg.set('JSON của code_ast không hợp lệ!'); return; }
    }

    this.isSaving.set(true);
    const req = this.isEditing() ? this.api.updateRule(this.editingId()!, body) : this.api.createRule(body);
    req.subscribe({
      next: () => { this.showModal.set(false); this.isSaving.set(false); this.flash('Lưu thành công!'); this.load(); },
      error: (e) => { this.isSaving.set(false); this.errorMsg.set(e.error?.message || 'Lỗi khi lưu.'); }
    });
  }

  confirmDelete(id: string): void { this.deletingId.set(id); this.showConfirm.set(true); }

  doDelete(): void {
    this.api.deleteRule(this.deletingId()!).subscribe({
      next: () => { this.showConfirm.set(false); this.flash('Đã xóa rule.'); this.load(); },
      error: (e) => { this.showConfirm.set(false); this.errorMsg.set(e.error?.message || 'Không thể xóa.'); }
    });
  }

  private flash(msg: string): void { this.successMsg.set(msg); setTimeout(() => this.successMsg.set(''), 3000); }
}
