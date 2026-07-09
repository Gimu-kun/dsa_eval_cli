import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, RuleResponse, RuleRequest, OrderedStep, ConceptResponse, RelationResponse, CodRuleStep } from '../../../services/admin-api.service';
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

  // Form – dùng snake_case để khớp với DTO

  // Form – dùng snake_case để khớp với DTO
  form = { name: '', err_message: '', type: 'SYN' as RuleType };
  // SYN - store as list of regex patterns
  synPatterns: { patternsText: string }[] = [
    { patternsText: '' }
  ];
  // ORD
  ordSteps: { description: string; rule_ids: string }[] = [{ description: '', rule_ids: '' }];
  // COD
  codAst = '';
  // COD steps
  codSteps: {
    u: string;
    suText: string;
    w: number;
    o: string;
    tText: string;
    astText: string;
  }[] = [{ u: 'u1', suText: '', w: 1.0, o: '', tText: '', astText: '' }];

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const t = this.filterType();
    return this.rules().filter(r =>
      (!t || r.type === t) && r.name.toLowerCase().includes(q)
    );
  });

  // Pagination state
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly paginatedRules = computed(() => {
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

  addSynPattern(): void {
    this.synPatterns.push({ patternsText: '' });
  }

  removeSynPattern(index: number): void {
    if (this.synPatterns.length > 1) {
      this.synPatterns.splice(index, 1);
    }
  }

  openCreate(): void {
    this.form = { name: '', err_message: '', type: 'SYN' };
    this.synPatterns = [{ patternsText: '' }];
    this.ordSteps = [{ description: '', rule_ids: '' }];
    this.codAst = '';
    this.codSteps = [{ u: 'u1', suText: '', w: 1.0, o: '', tText: '', astText: '' }];
    this.isEditing.set(false); this.editingId.set(null); this.showModal.set(true); this.errorMsg.set('');
  }

  openEdit(r: RuleResponse): void {
    this.form = { name: r.name, err_message: r.err_message, type: r.type };
    if (r.regex_patterns && r.regex_patterns.length > 0) {
      this.synPatterns = r.regex_patterns.map(rp => ({
        patternsText: rp.patterns ? rp.patterns.join(', ') : ''
      }));
    } else {
      this.synPatterns = [{ patternsText: '' }];
    }
    this.ordSteps = (r.ordered_steps ?? [{ step_order: 1, description: '', rule_ids: [] }])
      .map((s: OrderedStep) => ({ description: s.description, rule_ids: s.rule_ids.join(', ') }));
    this.codAst = r.code_ast ? JSON.stringify(r.code_ast, null, 2) : '';
    if (r.cod_steps && r.cod_steps.length > 0) {
      this.codSteps = r.cod_steps.map(s => ({
        u: s.u,
        suText: s.su ? s.su.join(', ') : '',
        w: s.w,
        o: s.o,
        tText: s.co && s.co.t ? s.co.t.join(', ') : '',
        astText: s.co && s.co.ast ? JSON.stringify(s.co.ast, null, 2) : ''
      }));
    } else {
      this.codSteps = [{ u: 'u1', suText: '', w: 1.0, o: '', tText: '', astText: '' }];
    }
    this.isEditing.set(true); this.editingId.set(r.id); this.showModal.set(true); this.errorMsg.set('');
  }

  addCodStep(): void {
    const nextIdx = this.codSteps.length + 1;
    this.codSteps.push({ u: 'u' + nextIdx, suText: '', w: 1.0, o: '', tText: '', astText: '' });
  }

  removeCodStep(index: number): void {
    if (this.codSteps.length > 1) {
      this.codSteps.splice(index, 1);
    }
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
      body.regex_patterns = this.synPatterns.map(rp => ({
        patterns: rp.patternsText.split(/[\n,]+/).map(p => p.trim()).filter(Boolean)
      }));
    } else if (this.form.type === 'ORD') {
      if (!this.ordSteps.some(s => s.description.trim())) { this.errorMsg.set('Phải có ít nhất 1 bước!'); return; }
      body.ordered_steps = this.ordSteps.map((s, i): OrderedStep => ({
        step_order: i + 1,
        description: s.description.trim(),
        rule_ids: s.rule_ids.split(',').map(r => r.trim()).filter(Boolean)
      }));
    } else if (this.form.type === 'COD') {
      if (!this.codSteps.some(s => s.u.trim())) {
        this.errorMsg.set('Phải có ít nhất 1 bước COD!'); return;
      }
      const stepsPayload: CodRuleStep[] = [];
      for (let i = 0; i < this.codSteps.length; i++) {
        const s = this.codSteps[i];
        if (!s.u.trim()) {
          this.errorMsg.set(`Mã bước tại vị trí ${i + 1} không được để trống!`); return;
        }
        let astParsed = null;
        if (s.astText.trim()) {
          try {
            astParsed = JSON.parse(s.astText);
          } catch {
            this.errorMsg.set(`JSON của cây AST tại bước ${s.u} không hợp lệ!`); return;
          }
        }
        stepsPayload.push({
          u: s.u.trim(),
          su: s.suText.split(',').map(x => x.trim()).filter(Boolean),
          w: Number(s.w) || 0,
          o: s.o.trim(),
          co: {
            t: s.tText.split(',').map(x => x.trim()).filter(Boolean),
            ast: astParsed
          }
        });
      }
      body.cod_steps = stepsPayload;
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
