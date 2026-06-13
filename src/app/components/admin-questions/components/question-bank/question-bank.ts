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
  ruleSearchQuery?: string;
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

  // Dialog visibility state
  protected readonly showQuestionModal = signal<boolean>(false);

  // Search filter query
  protected ruleSearchQuery = '';
  protected conceptSearchQuery = '';
  protected relationSearchQuery = '';

  // Custom Rubric Mode & inputs
  protected newRubricMode = false;
  protected newRubricDescription = '';
  protected newRubricAccW = 0.4;
  protected newRubricCompW = 0.3;
  protected newRubricLogW = 0.3;

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
  
  // Multiselect Concept, Relation, Rule, Function IDs and weights
  protected selectedConceptIds: string[] = [];
  protected selectedRelationIds: string[] = [];
  protected selectedRuleIds: string[] = [];
  protected selectedFunctionIds: string[] = [];
  protected ruleWeights: { [ruleId: string]: number } = {};
  protected logicalStepSequenceWeight = 0.2;

  // Expected Answer steps for PROCEDURAL
  protected proceduralSteps: ProceduralStepInput[] = [
    { stepOrder: 1, description: '', ruleIds: [], ruleSearchQuery: '' }
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
  protected getConcept(conceptId: string): ConceptResponse | undefined {
    return this.concepts().find(x => x.id === conceptId);
  }

  protected getRelation(relationId: string): RelationResponse | undefined {
    return this.relations().find(x => x.id === relationId);
  }

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
      delete this.ruleWeights[ruleId];
    } else {
      this.selectedRuleIds.push(ruleId);
      if (this.ruleWeights[ruleId] === undefined) {
        this.ruleWeights[ruleId] = 0.0;
      }
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

  // --- Concept and Relation Selection helpers ---
  protected toggleConceptSelection(conceptId: string): void {
    const idx = this.selectedConceptIds.indexOf(conceptId);
    if (idx > -1) {
      this.selectedConceptIds.splice(idx, 1);
    } else {
      this.selectedConceptIds.push(conceptId);
    }
  }

  protected toggleRelationSelection(relationId: string): void {
    const idx = this.selectedRelationIds.indexOf(relationId);
    if (idx > -1) {
      this.selectedRelationIds.splice(idx, 1);
    } else {
      this.selectedRelationIds.push(relationId);
    }
  }

  protected getFilteredConcepts(): ConceptResponse[] {
    const q = this.conceptSearchQuery.trim().toLowerCase();
    if (!q) return this.concepts();
    return this.concepts().filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      c.synonyms?.some(syn => syn.toLowerCase().includes(q))
    );
  }

  protected getFilteredRelations(): RelationResponse[] {
    const q = this.relationSearchQuery.trim().toLowerCase();
    if (!q) return this.relations();
    return this.relations().filter(r =>
      (r.description || '').toLowerCase().includes(q) ||
      (r.source_title || '').toLowerCase().includes(q) ||
      (r.target_title || '').toLowerCase().includes(q) ||
      (r.relation_title || '').toLowerCase().includes(q)
    );
  }

  protected getUniqueSelectedRules(): string[] {
    if (this.selectedType !== 'PROCEDURE') {
      return this.selectedRuleIds;
    }
    const stepRulesSet = new Set<string>();
    this.proceduralSteps.forEach(s => s.ruleIds.forEach(rid => stepRulesSet.add(rid)));
    const uniqueList = Array.from(stepRulesSet);
    
    uniqueList.forEach(rid => {
      if (this.ruleWeights[rid] === undefined) {
        this.ruleWeights[rid] = 0.0;
      }
    });
    return uniqueList;
  }

  protected getWeightsSum(): number {
    const uniqueRules = this.getUniqueSelectedRules();
    let sum = uniqueRules.reduce((acc, rId) => acc + (Number(this.ruleWeights[rId]) || 0), 0);
    if (this.selectedType === 'PROCEDURE') {
      sum += Number(this.logicalStepSequenceWeight) || 0;
    }
    return Math.round(sum * 1000) / 1000;
  }

  protected isWeightsValid(): boolean {
    return Math.abs(this.getWeightsSum() - 1.0) < 0.001;
  }

  // --- Edit Mode ---
  protected openAddQuestionModal(): void {
    this.editingQuestionId.set(null);
    this.resetForm();
    this.showQuestionModal.set(true);
  }

  protected getFilteredRules(query: string): RuleResponse[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.rules();
    return this.rules().filter(r => {
      const nameMatch = (r.name || '').toLowerCase().includes(q);
      const typeMatch = (r.type || '').toLowerCase().includes(q);
      const conceptMatch = r.concept_ids?.some(cId => this.getConceptSynonyms(cId).toLowerCase().includes(q));
      const relationMatch = r.relation_ids?.some(rId => this.getRelationConnectionText(rId).toLowerCase().includes(q));
      return nameMatch || typeMatch || conceptMatch || relationMatch;
    });
  }

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
    this.selectedConceptIds = [];
    this.selectedRelationIds = [];
    this.ruleWeights = {};
    this.logicalStepSequenceWeight = 0.2;
    this.proceduralSteps = [{ stepOrder: 1, description: '', ruleIds: [], ruleSearchQuery: '' }];
    this.newRubricMode = false;

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
              ruleIds: item.ruleIds || item.rule_ids || [],
              ruleSearchQuery: ''
            }));
          }
        } catch {
          this.proceduralSteps = [{ stepOrder: 1, description: sample, ruleIds: [], ruleSearchQuery: '' }];
        }
      }

      if (q.ex_ans.concepts) {
        this.selectedConceptIds = q.ex_ans.concepts.map(c => c.id);
      }
      if (q.ex_ans.relations) {
        this.selectedRelationIds = q.ex_ans.relations.map(r => r.id);
      }
      if (q.ex_ans.rules) {
        this.selectedRuleIds = q.ex_ans.rules.map(r => r.id);
        q.ex_ans.rules.forEach(r => {
          this.ruleWeights[r.id] = r.weight;
        });
      }
      if (q.ex_ans.functions) {
        this.selectedFunctionIds = q.ex_ans.functions.map(f => f.id);
      }
      if (q.ex_ans.logical_step_sequence_weight !== undefined && q.ex_ans.logical_step_sequence_weight !== null) {
        this.logicalStepSequenceWeight = q.ex_ans.logical_step_sequence_weight;
      }
    }
    this.showQuestionModal.set(true);
  }

  protected cancelEdit(): void {
    this.editingQuestionId.set(null);
    this.resetForm();
    this.showQuestionModal.set(false);
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

    // Weight validation check
    if (!this.isWeightsValid()) {
      this.errorMessage.set(`Tổng trọng số các quy tắc phải bằng 1.0. Hiện tại: ${this.getWeightsSum()}`);
      return;
    }

    // Dynamic Rubric Creation inline
    if (this.newRubricMode) {
      if (!this.newRubricDescription.trim()) {
        this.errorMessage.set('Mô tả Rubric mới không được để trống.');
        return;
      }
      const sum = Number(this.newRubricAccW) + Number(this.newRubricCompW) + Number(this.newRubricLogW);
      if (Math.abs(sum - 1.0) > 0.01) {
        this.errorMessage.set('Tổng trọng số Rubric (acc + comp + log) phải bằng 1.0.');
        return;
      }

      this.isSubmitting.set(true);
      const rubricPayload = {
        description: this.newRubricDescription.trim(),
        acc_w: Number(this.newRubricAccW),
        comp_w: Number(this.newRubricCompW),
        log_w: Number(this.newRubricLogW)
      };

      this.adminApi.createRubric(rubricPayload).subscribe({
        next: (newRub) => {
          this.adminApi.getRubrics().subscribe({
            next: (res) => {
              this.rubrics.set(res);
              this.selectedRubricId = newRub.id;
              this.newRubricMode = false; // reset mode
              this.submitQuestion();
            },
            error: () => {
              this.isSubmitting.set(false);
              this.errorMessage.set('Tạo Rubric mới thành công nhưng có lỗi khi tải lại danh sách Rubrics.');
            }
          });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi tạo Rubric mới.');
        }
      });
    } else {
      if (!this.selectedRubricId) {
        this.errorMessage.set('Vui lòng chọn một Rubric.');
        return;
      }
      this.submitQuestion();
    }
  }

  private submitQuestion(): void {
    // Build sample expected answer depending on type
    let sampleVal = '';
    let finalRuleIds = this.getUniqueSelectedRules();
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
    }

    const rulesPayload = finalRuleIds.map(rId => ({
      rule_id: rId,
      weight: Number(this.ruleWeights[rId]) || 0.0
    }));

    const payload = {
      topic_id: this.selectedTopicId,
      rubric_id: this.selectedRubricId,
      content: this.content.trim(),
      type: this.selectedType,
      bloom_level: this.selectedBloom,
      difficulty: this.selectedDifficulty,
      ex_ans: {
        sample: sampleVal,
        concepts: this.selectedConceptIds,
        relations: this.selectedRelationIds,
        rules: rulesPayload,
        functions: finalFuncIds,
        logical_step_sequence_weight: this.selectedType === 'PROCEDURE' ? Number(this.logicalStepSequenceWeight) : null
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
          this.showQuestionModal.set(false);
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
    this.selectedConceptIds = [];
    this.selectedRelationIds = [];
    this.ruleWeights = {};
    this.logicalStepSequenceWeight = 0.2;
    this.proceduralSteps = [
      { stepOrder: 1, description: '', ruleIds: [], ruleSearchQuery: '' }
    ];
    this.newRubricMode = false;
    this.newRubricDescription = '';
    this.newRubricAccW = 0.4;
    this.newRubricCompW = 0.3;
    this.newRubricLogW = 0.3;
    this.ruleSearchQuery = '';
    this.conceptSearchQuery = '';
    this.relationSearchQuery = '';
  }
}
