import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TopicRequest { chapter_id: string; title: string; parent_id?: string; }
export interface TopicResponse { id: string; title: string; chapter_id: string; parent_id?: string; }
export interface ChapterResponse { id: string; chapter_name: string; precedes_id?: string; }

export interface RubricRequest  { description: string; acc_w: number; comp_w: number; log_w: number; }
export interface RubricResponse { id: string; description: string; acc_w: number; comp_w: number; log_w: number; created_at?: string; }

export interface ConceptRequest  { title: string; synonyms: string[]; topic_ids?: string[]; }
export interface ConceptResponse { id: string; title: string; synonyms: string[]; topic_ids: string[]; }

export interface RelationRequest  {
  description: string; regex_pattern: string; err_message: string;
  source_id?: string; target_id?: string; relation_id: string;
}
export interface RelationResponse {
  id: string; description: string; regex_pattern: string; err_message: string;
  source_id?: string; source_title?: string;
  target_id?: string; target_title?: string;
  relation_id?: string; relation_title?: string;
}

export interface OrderedStep    { step_order: number; description: string; rule_ids: string[]; }
export interface GenericAstNode { root_type: string; content?: string; children?: GenericAstNode[]; }

export interface RuleRequest {
  name: string; err_message: string; type: 'SYN' | 'ORD' | 'COD';
  concept_ids?: string[]; relation_ids?: string[];
  ordered_steps?: OrderedStep[];
  code_ast?: GenericAstNode;
}
export interface RuleResponse {
  id: string; name: string; err_message: string; type: 'SYN' | 'ORD' | 'COD';
  concept_ids?: string[]; relation_ids?: string[];
  ordered_steps?: OrderedStep[];
  code_ast?: GenericAstNode;
}

export interface FuncRequest  { name: string; regex_pattern: string; err_message: string; }
export interface FuncResponse { id: string; name: string; regex_pattern: string; err_message: string; }

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/v1';

  // --- Topics ---
  getTopics(): Observable<TopicResponse[]>                              { return this.http.get<TopicResponse[]>(`${this.base}/topics`); }
  getTopic(id: string): Observable<TopicResponse>                      { return this.http.get<TopicResponse>(`${this.base}/topics/${id}`); }
  createTopic(b: TopicRequest): Observable<TopicResponse>              { return this.http.post<TopicResponse>(`${this.base}/topics`, b); }
  updateTopic(id: string, b: TopicRequest): Observable<TopicResponse>  { return this.http.put<TopicResponse>(`${this.base}/topics/${id}`, b); }
  deleteTopic(id: string): Observable<any>                             { return this.http.delete(`${this.base}/topics/${id}`); }

  // --- Rubrics ---
  getRubrics(): Observable<RubricResponse[]>                              { return this.http.get<RubricResponse[]>(`${this.base}/rubrics`); }
  getRubric(id: string): Observable<RubricResponse>                      { return this.http.get<RubricResponse>(`${this.base}/rubrics/${id}`); }
  createRubric(b: RubricRequest): Observable<RubricResponse>             { return this.http.post<RubricResponse>(`${this.base}/rubrics`, b); }
  updateRubric(id: string, b: RubricRequest): Observable<RubricResponse> { return this.http.put<RubricResponse>(`${this.base}/rubrics/${id}`, b); }
  deleteRubric(id: string): Observable<any>                              { return this.http.delete(`${this.base}/rubrics/${id}`); }

  // --- Concepts ---
  getConcepts(): Observable<ConceptResponse[]>                              { return this.http.get<ConceptResponse[]>(`${this.base}/concepts`); }
  getConcept(id: string): Observable<ConceptResponse>                      { return this.http.get<ConceptResponse>(`${this.base}/concepts/${id}`); }
  createConcept(b: ConceptRequest): Observable<ConceptResponse>            { return this.http.post<ConceptResponse>(`${this.base}/concepts`, b); }
  updateConcept(id: string, b: ConceptRequest): Observable<ConceptResponse>{ return this.http.put<ConceptResponse>(`${this.base}/concepts/${id}`, b); }
  deleteConcept(id: string): Observable<any>                               { return this.http.delete(`${this.base}/concepts/${id}`); }

  // --- Relations ---
  getRelations(): Observable<RelationResponse[]>                               { return this.http.get<RelationResponse[]>(`${this.base}/relations`); }
  getRelation(id: string): Observable<RelationResponse>                        { return this.http.get<RelationResponse>(`${this.base}/relations/${id}`); }
  createRelation(b: RelationRequest): Observable<RelationResponse>             { return this.http.post<RelationResponse>(`${this.base}/relations`, b); }
  updateRelation(id: string, b: RelationRequest): Observable<RelationResponse> { return this.http.put<RelationResponse>(`${this.base}/relations/${id}`, b); }
  deleteRelation(id: string): Observable<any>                                  { return this.http.delete(`${this.base}/relations/${id}`); }

  // --- Rules ---
  getRules(): Observable<RuleResponse[]>                              { return this.http.get<RuleResponse[]>(`${this.base}/rules`); }
  getRule(id: string): Observable<RuleResponse>                       { return this.http.get<RuleResponse>(`${this.base}/rules/${id}`); }
  createRule(b: RuleRequest): Observable<RuleResponse>                { return this.http.post<RuleResponse>(`${this.base}/rules`, b); }
  updateRule(id: string, b: RuleRequest): Observable<RuleResponse>    { return this.http.put<RuleResponse>(`${this.base}/rules/${id}`, b); }
  deleteRule(id: string): Observable<any>                             { return this.http.delete(`${this.base}/rules/${id}`); }

  // --- Funcs ---
  getFuncs(): Observable<FuncResponse[]>                              { return this.http.get<FuncResponse[]>(`${this.base}/funcs`); }
  getFunc(id: string): Observable<FuncResponse>                       { return this.http.get<FuncResponse>(`${this.base}/funcs/${id}`); }
  createFunc(b: FuncRequest): Observable<FuncResponse>                { return this.http.post<FuncResponse>(`${this.base}/funcs`, b); }
  updateFunc(id: string, b: FuncRequest): Observable<FuncResponse>    { return this.http.put<FuncResponse>(`${this.base}/funcs/${id}`, b); }
  deleteFunc(id: string): Observable<any>                             { return this.http.delete(`${this.base}/funcs/${id}`); }

  // --- Metadata ---
  getBloomLevels(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/bloom-levels`); }
  getDifficulties(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/difficulties`); }
  getQuestionTypes(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/question-types`); }
  getChapters(): Observable<ChapterResponse[]> { return this.http.get<ChapterResponse[]>(`${this.base}/chapters`); }
}
