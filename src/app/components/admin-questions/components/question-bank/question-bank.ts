import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ConceptResponse, RelationResponse, RuleResponse, FuncResponse, TopicResponse, RubricResponse } from '../../../../services/admin-api.service';
import { QuestionApiService } from '../../../../services/question-api.service';
import { Question, ExpectedAnswer, Rubric } from '../../../../models/dsa-models';

interface ProceduralStepInput {
  stepOrder: number;
  description: string;
  ruleIds: string[];
}

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-bank.html'
})
export class QuestionBankComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly questionApi = inject(QuestionApiService);

  // Lists loaded from real APIs
  protected readonly questions = signal<Question[]>([]);
  protected readonly topics = signal<TopicResponse[]>([]);
  protected readonly rubrics = signal<RubricResponse[]>([]);
  protected readonly rules = signal<RuleResponse[]>([]);
  protected readonly functions = signal<FuncResponse[]>([]);
  protected readonly concepts = signal<ConceptResponse[]>([]);
  protected readonly relations = signal<RelationResponse[]>([]);
  protected readonly bloomLevels = signal<any[]>([]);
  protected readonly difficulties = signal<any[]>([]);
  protected readonly questionTypes = signal<any[]>([]);

  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly successMessage = signal<string>('');
  protected readonly errorMessage = signal<string>('');

  // Editing state
  protected readonly editingQuestionId = signal<string | null>(null);

  // Form Models
  protected content = '';
  protected selectedTopicId = '';
  protected selectedType = 'DESCRIPTIVE';
  protected selectedBloom = '';
  protected selectedDifficulty = '';
  protected selectedRubricId = '';

  // Expected Answer for DESCRIPTIVE and APPLICATION
  protected descriptiveAnswer = '';
  protected applicationAnswer = '';
  
  // Multiselect Rule and Function IDs (for DESCRIPTIVE & APPLICATION)
  protected selectedRuleIds: string[] = [];
  protected selectedFunctionIds: string[] = [];

  // Expected Answer steps for PROCEDURAL
  protected proceduralSteps: ProceduralStepInput[] = [
    { stepOrder: 1, description: '', ruleIds: [] }
  ];

  ngOnInit(): void {
    this.loadAllData();
  }

  private loadAllData(): void {
    this.adminApi.getTopics().subscribe({
      next: (res) => {
        this.topics.set(res);
        if (res.length > 0) this.selectedTopicId = res[0].id;
      }
    });

    this.adminApi.getRubrics().subscribe({
      next: (res) => {
        this.rubrics.set(res);
        if (res.length > 0) this.selectedRubricId = res[0].id;
      }
    });

    this.adminApi.getRules().subscribe(res => this.rules.set(res));
    this.adminApi.getFuncs().subscribe(res => this.functions.set(res));
    this.adminApi.getConcepts().subscribe(res => this.concepts.set(res));
    this.adminApi.getRelations().subscribe(res => this.relations.set(res));

    this.adminApi.getBloomLevels().subscribe({
      next: (res) => {
        this.bloomLevels.set(res);
        if (res.length > 0) this.selectedBloom = res[0].display_name || res[0].id;
      }
    });

    this.adminApi.getDifficulties().subscribe({
      next: (res) => {
        this.difficulties.set(res);
        if (res.length > 0) this.selectedDifficulty = res[0].display_name || res[0].id;
      }
    });

    this.adminApi.getQuestionTypes().subscribe({
      next: (res) => {
        this.questionTypes.set(res);
      }
    });

    this.refreshQuestions();
  }

  protected refreshQuestions(): void {
    this.questionApi.getQuestions().subscribe({
      next: (res) => this.questions.set(res),
      error: (err) => console.error('Lỗi khi tải danh sách câu hỏi:', err)
    });
  }

  protected getQuestionsList(): Question[] {
    return this.questions();
  }

  protected getTopicName(topicId: string): string {
    return this.topics().find(t => t.id === topicId)?.title || topicId;
  }

  // --- Lookup Info display helpers ---
  protected getConceptSynonyms(conceptId: string): string {
    const c = this.concepts().find(x => x.id === conceptId);
    if (!c) return '';
    const syns = c.synonyms && c.synonyms.length > 0 ? ` [Syns: ${c.synonyms.join(', ')}]` : '';
    return `${c.title}${syns}`;
  }

  protected getRelationConnectionText(relationId: string): string {
    const r = this.relations().find(x => x.id === relationId);
    if (!r) return '';
    const src = r.source_title || 'N/A';
    const tgt = r.target_title || 'N/A';
    const rel = r.relation_title || 'N/A';
    return `${r.description || 'Quan hệ'} (${src} --[${rel}]--> ${tgt})`;
  }

  protected getRuleDescription(ruleId: string): string {
    const r = this.rules().find(x => x.id === ruleId);
    if (!r) return '';
    return `${r.name} (${r.type})`;
  }

  protected getRubricDetail(rubricId: string): string {
    const rub = this.rubrics().find(x => x.id === rubricId);
    if (!rub) return '';
    return `${rub.description} (acc: ${rub.acc_w}, comp: ${rub.comp_w}, log: ${rub.log_w})`;
  }

  // --- Procedural Steps actions ---
  protected addStep(): void {
    const nextOrder = this.proceduralSteps.length + 1;
    this.proceduralSteps.push({
      stepOrder: nextOrder,
      description: '',
      ruleIds: []
    });
  }

  protected removeStep(index: number): void {
    if (this.proceduralSteps.length <= 1) return;
    this.proceduralSteps.splice(index, 1);
    // Recalculate step orders
    this.proceduralSteps.forEach((s, i) => s.stepOrder = i + 1);
  }

  protected toggleStepRule(step: ProceduralStepInput, ruleId: string): void {
    const idx = step.ruleIds.indexOf(ruleId);
    if (idx > -1) {
      step.ruleIds.splice(idx, 1);
    } else {
      step.ruleIds.push(ruleId);
    }
  }

  protected isStepRuleSelected(step: ProceduralStepInput, ruleId: string): boolean {
    return step.ruleIds.includes(ruleId);
  }

  // --- Rule/Func multiselect checkboxes ---
  protected toggleRuleSelection(ruleId: string): void {
    const idx = this.selectedRuleIds.indexOf(ruleId);
    if (idx > -1) {
      this.selectedRuleIds.splice(idx, 1);
    } else {
      this.selectedRuleIds.push(ruleId);
    }
  }

  protected toggleFuncSelection(funcId: string): void {
    const idx = this.selectedFunctionIds.indexOf(funcId);
    if (idx > -1) {
      this.selectedFunctionIds.splice(idx, 1);
    } else {
      this.selectedFunctionIds.push(funcId);
    }
  }

  // --- Edit Mode ---
  protected onEditQuestion(q: Question): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.editingQuestionId.set(q.id);

    this.content = q.content;
    this.selectedTopicId = q.topic_id;
    this.selectedType = q.type;
    this.selectedBloom = q.bloom_level;
    this.selectedDifficulty = q.difficulty;
    this.selectedRubricId = q.rubric?.id || '';

    // Reset expected answers
    this.descriptiveAnswer = '';
    this.applicationAnswer = '';
    this.selectedRuleIds = [];
    this.selectedFunctionIds = [];
    this.proceduralSteps = [{ stepOrder: 1, description: '', ruleIds: [] }];

    if (q.ex_ans) {
      const sample = q.ex_ans.sample || '';
      if (q.type === 'DESCRIPTIVE') {
        this.descriptiveAnswer = sample;
      } else if (q.type === 'APPLICATION') {
        // Sample in APPLICATION is GenericAstNode JSON.
        try {
          const ast = JSON.parse(sample);
          this.applicationAnswer = ast.content || sample;
        } catch {
          this.applicationAnswer = sample;
        }
      } else if (q.type === 'PROCEDURE') {
        try {
          const parsed = JSON.parse(sample);
          if (Array.isArray(parsed)) {
            this.proceduralSteps = parsed.map((item: any) => ({
              stepOrder: item.stepOrder || item.step_order || 1,
              description: item.description || '',
              ruleIds: item.ruleIds || item.rule_ids || []
            }));
          }
        } catch {
          this.proceduralSteps = [{ stepOrder: 1, description: sample, ruleIds: [] }];
        }
      }

      if (q.ex_ans.rules) {
        this.selectedRuleIds = q.ex_ans.rules.map(r => r.id);
      }
      if (q.ex_ans.functions) {
        this.selectedFunctionIds = q.ex_ans.functions.map(f => f.id);
      }
    }
  }

  protected cancelEdit(): void {
    this.editingQuestionId.set(null);
    this.resetForm();
  }

  // --- Submit form ---
  protected onSubmit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.content.trim()) {
      this.errorMessage.set('Nội dung câu hỏi không được để trống.');
      return;
    }

    if (!this.selectedTopicId) {
      this.errorMessage.set('Vui lòng chọn một chủ đề.');
      return;
    }

    if (!this.selectedRubricId) {
      this.errorMessage.set('Vui lòng chọn một Rubric.');
      return;
    }

    // Build sample expected answer depending on type
    let sampleVal = '';
    let finalRuleIds = [...this.selectedRuleIds];
    let finalFuncIds = [...this.selectedFunctionIds];

    if (this.selectedType === 'DESCRIPTIVE') {
      sampleVal = this.descriptiveAnswer.trim();
    } else if (this.selectedType === 'APPLICATION') {
      // Convert to GenericAstNode JSON structure
      const astPayload = {
        root_type: 'PROGRAM',
        content: this.applicationAnswer.trim(),
        children: []
      };
      sampleVal = JSON.stringify(astPayload);
    } else if (this.selectedType === 'PROCEDURE') {
      // Convert proceduralSteps list to OrderedStepDto JSON
      const stepsPayload = this.proceduralSteps.map(s => ({
        step_order: s.stepOrder,
        description: s.description.trim(),
        rule_ids: s.ruleIds
      }));
      sampleVal = JSON.stringify(stepsPayload);

      // In PROCEDURAL type, collect all rules mentioned in steps to register in ex_ans.rules ManyToMany
      const stepRulesSet = new Set<string>();
      this.proceduralSteps.forEach(s => s.ruleIds.forEach(rid => stepRulesSet.add(rid)));
      finalRuleIds = Array.from(stepRulesSet);
    }

    const payload = {
      topic_id: this.selectedTopicId,
      rubric_id: this.selectedRubricId,
      content: this.content.trim(),
      type: this.selectedType,
      bloom_level: this.selectedBloom,
      difficulty: this.selectedDifficulty,
      ex_ans: {
        sample: sampleVal,
        rules: finalRuleIds,
        functions: finalFuncIds
      }
    };

    this.isSubmitting.set(true);

    const editId = this.editingQuestionId();
    if (editId) {
      this.questionApi.updateQuestion(editId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Cập nhật câu hỏi thành công!');
          this.cancelEdit();
          this.refreshQuestions();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi cập nhật câu hỏi.');
        }
      });
    } else {
      this.questionApi.createQuestion(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Tạo câu hỏi mới thành công!');
          this.resetForm();
          this.refreshQuestions();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi tạo câu hỏi.');
        }
      });
    }
  }

  protected onDeleteQuestion(id: string): void {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này không? Thao tác này cũng sẽ xóa các câu trả lời của học viên đối với câu hỏi này.')) {
      return;
    }
    this.successMessage.set('');
    this.errorMessage.set('');
    this.questionApi.deleteQuestion(id).subscribe({
      next: () => {
        this.successMessage.set('Xóa câu hỏi thành công!');
        if (this.editingQuestionId() === id) {
          this.cancelEdit();
        }
        this.refreshQuestions();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Không thể xóa câu hỏi này.');
      }
    });
  }

  private resetForm(): void {
    this.content = '';
    this.descriptiveAnswer = '';
    this.applicationAnswer = '';
    this.selectedRuleIds = [];
    this.selectedFunctionIds = [];
    this.proceduralSteps = [
      { stepOrder: 1, description: '', ruleIds: [] }
    ];
  }
}
