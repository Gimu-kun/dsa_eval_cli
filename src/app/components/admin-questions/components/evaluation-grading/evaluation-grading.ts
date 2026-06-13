import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../../services/admin-api.service';

@Component({
  selector: 'app-evaluation-grading',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evaluation-grading.html'
})
export class EvaluationGradingComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  protected readonly successMessage = signal<string>('');
  protected readonly errorMessage = signal<string>('');
  protected readonly isLoading = signal<boolean>(false);
  protected readonly isSubmitting = signal<boolean>(false);

  // Lists
  protected readonly conceptsList = signal<any[]>([]);
  protected readonly relationsList = signal<any[]>([]);
  protected readonly rulesList = signal<any[]>([]);
  protected readonly functionsList = signal<any[]>([]);

  // Concept inputs
  protected cptDesc = '';
  protected cptErr = '';
  protected cptTerms = '';

  // Concept Edit state
  protected readonly editingConceptId = signal<string | null>(null);
  protected editCptDesc = '';
  protected editCptErr = '';
  protected editCptTerms = '';

  // Relation inputs
  protected srDesc = '';
  protected srPattern = '';
  protected srErr = '';
  protected srSrcId = '';
  protected srTargetId = '';
  protected srRelationId = '';

  // Rule inputs
  protected lrDesc = '';
  protected lrPattern = '';
  protected lrErr = '';
  protected lrType = 'AND';
  protected lrWeight = 1.0;
  protected lrConceptIds = '';
  protected lrExpectedSteps = '';
  protected lrAstStructure = '';

  // Function inputs
  protected lfDesc = '';
  protected lfPatterns = '';
  protected lfErr = '';
  protected lfType = 'AND';

  ngOnInit(): void {
    this.loadEvaluationElements();
  }

  protected loadEvaluationElements(): void {
    this.isLoading.set(true);
    
    this.adminApi.getConcepts().subscribe({
      next: (res) => this.conceptsList.set(res),
      error: (err) => console.error('Lỗi khi tải danh sách khái niệm:', err)
    });

    this.adminApi.getRelations().subscribe({
      next: (res) => this.relationsList.set(res),
      error: (err) => console.error('Lỗi khi tải danh sách quan hệ:', err)
    });

    this.adminApi.getRules().subscribe({
      next: (res) => this.rulesList.set(res),
      error: (err) => console.error('Lỗi khi tải danh sách quy tắc:', err)
    });

    this.adminApi.getFuncs().subscribe({
      next: (res) => {
        this.functionsList.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách hàm:', err);
        this.isLoading.set(false);
      }
    });
  }

  protected onCreateConcept(): void {
    if (!this.cptDesc.trim() || !this.cptTerms.trim()) {
      this.errorMessage.set('Mô tả và Tập khái niệm (Terms) không được để trống.');
      return;
    }
    const termsArray = this.cptTerms.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const payload = {
      title: this.cptDesc.trim(),
      synonyms: termsArray
    };
    this.isSubmitting.set(true);
    this.adminApi.createConcept(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Tạo Khái niệm thành công!');
        this.cptDesc = '';
        this.cptErr = '';
        this.cptTerms = '';
        this.loadEvaluationElements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Lỗi khi tạo khái niệm.');
      }
    });
  }

  protected onStartEditConcept(concept: any): void {
    this.editingConceptId.set(concept.id);
    this.editCptDesc = concept.title || concept.description;
    this.editCptErr = concept.errMessage || '';
    
    // Map concept terms to a simple string array for JSON editing
    const termValues = concept.synonyms || [];
    this.editCptTerms = JSON.stringify(termValues, null, 2);
  }

  protected onCancelEditConcept(): void {
    this.editingConceptId.set(null);
    this.editCptDesc = '';
    this.editCptErr = '';
    this.editCptTerms = '';
  }

  protected onSaveConcept(id: string): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.editCptDesc.trim() || !this.editCptTerms.trim()) {
      this.errorMessage.set('Mô tả và Tập khái niệm (Terms) không được để trống.');
      return;
    }

    let parsedTerms: string[] = [];
    try {
      parsedTerms = JSON.parse(this.editCptTerms);
      if (!Array.isArray(parsedTerms)) {
        throw new Error('Định dạng phải là một mảng JSON (ví dụ: ["a", "b"])');
      }
      parsedTerms = parsedTerms.map(t => String(t).trim()).filter(t => t.length > 0);
    } catch (e: any) {
      this.errorMessage.set('Định dạng JSON tập từ khóa không hợp lệ: ' + e.message);
      return;
    }

    const payload = {
      title: this.editCptDesc.trim(),
      synonyms: parsedTerms
    };

    this.isSubmitting.set(true);
    this.adminApi.updateConcept(id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Cập nhật khái niệm thành công!');
        this.onCancelEditConcept();
        this.loadEvaluationElements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Lỗi khi cập nhật khái niệm.');
      }
    });
  }

  protected onDeleteConcept(id: string): void {
    if (!confirm('Xóa khái niệm này?')) return;
    this.adminApi.deleteConcept(id).subscribe({
      next: () => {
        this.successMessage.set('Xóa khái niệm thành công!');
        this.loadEvaluationElements();
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'Không thể xóa khái niệm này.')
    });
  }

  protected onCreateRelation(): void {
    if (!this.srDesc.trim() || !this.srPattern.trim() || !this.srSrcId.trim() || !this.srRelationId.trim()) {
      this.errorMessage.set('Vui lòng điền đầy đủ thông tin: mô tả, regex, khái niệm nguồn và khái niệm quan hệ.');
      return;
    }
    const payload = {
      description: this.srDesc.trim(),
      regex_pattern: this.srPattern.trim(),
      err_message: this.srErr.trim() || 'Sai cấu trúc quan hệ ngữ nghĩa',
      source_id: this.srSrcId.trim(),
      target_id: this.srTargetId.trim() || undefined,
      relation_id: this.srRelationId.trim()
    };
    this.isSubmitting.set(true);
    this.adminApi.createRelation(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Tạo Quan hệ ngữ nghĩa thành công!');
        this.srDesc = '';
        this.srPattern = '';
        this.srErr = '';
        this.srSrcId = '';
        this.srTargetId = '';
        this.srRelationId = '';
        this.loadEvaluationElements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Lỗi khi tạo quan hệ ngữ nghĩa.');
      }
    });
  }

  protected onDeleteRelation(id: string): void {
    if (!confirm('Xóa quan hệ này?')) return;
    this.adminApi.deleteRelation(id).subscribe({
      next: () => {
        this.successMessage.set('Xóa quan hệ thành công!');
        this.loadEvaluationElements();
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'Không thể xóa quan hệ này.')
    });
  }

  protected onCreateRule(): void {
    if (!this.lrDesc.trim() || !this.lrPattern.trim()) {
      this.errorMessage.set('Mô tả và quy tắc không được để trống.');
      return;
    }
    const conceptIdsArray = this.lrConceptIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
    const payload = {
      name: this.lrDesc.trim(),
      err_message: this.lrErr.trim() || 'Sai quy tắc suy diễn logic',
      type: 'SYN' as const,
      weight: this.lrWeight,
      concept_ids: conceptIdsArray
    };
    this.isSubmitting.set(true);
    this.adminApi.createRule(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Tạo Quy tắc logic thành công!');
        this.lrDesc = '';
        this.lrPattern = '';
        this.lrErr = '';
        this.lrConceptIds = '';
        this.lrWeight = 1.0;
        this.lrExpectedSteps = '';
        this.lrAstStructure = '';
        this.loadEvaluationElements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Lỗi khi tạo quy tắc logic.');
      }
    });
  }

  protected onDeleteRule(id: string): void {
    if (!confirm('Xóa quy tắc này?')) return;
    this.adminApi.deleteRule(id).subscribe({
      next: () => {
        this.successMessage.set('Xóa quy tắc thành công!');
        this.loadEvaluationElements();
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'Không thể xóa quy tắc này.')
    });
  }

  protected onCreateFunction(): void {
    if (!this.lfDesc.trim() || !this.lfPatterns.trim()) {
      this.errorMessage.set('Mô tả và tập biểu thức Regex không được để trống.');
      return;
    }
    const payload = {
      name: this.lfDesc.trim(),
      regex_pattern: this.lfPatterns.trim(),
      err_message: this.lfErr.trim() || 'Sai cấu trúc kiểm định hàm'
    };
    this.isSubmitting.set(true);
    this.adminApi.createFunc(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Tạo Hàm logic thành công!');
        this.lfDesc = '';
        this.lfPatterns = '';
        this.lfErr = '';
        this.loadEvaluationElements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Lỗi khi tạo hàm logic.');
      }
    });
  }

  protected onDeleteFunction(id: string): void {
    if (!confirm('Xóa hàm này?')) return;
    this.adminApi.deleteFunc(id).subscribe({
      next: () => {
        this.successMessage.set('Xóa hàm thành công!');
        this.loadEvaluationElements();
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'Không thể xóa hàm này.')
    });
  }
}
