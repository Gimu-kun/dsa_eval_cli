export type BloomLevel = 'REMEMBERING' | 'UNDERSTANDING' | 'APPLYING';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'DESCRIPTIVE' | 'PROCEDURE' | 'APPLICATION';

export interface Term {
  id: string;
  concept_id: string;
  value: string;
}

export interface Concept {
  id: string;
  description: string;
  err_message: string | null;
  terms: Term[];
}

export interface Relation {
  id: string;
  description: string;
  err_message: string | null;
  regex_pattern: string;
  relation_concept_id: Concept | null;
  src_concept_id: Concept | null;
  target_concept_id: Concept | null;
}

export interface Rule {
  id: string;
  description: string;
  err_message: string | null;
  concepts_id: string[];
  logical_type: 'AND' | 'OR';
  regex_pattern: string;
  weight: number;
}

export interface EvaluatedFunction {
  id: string;
  description: string;
  err_message: string | null;
  logical_type: 'AND' | 'OR';
  regex_pattern: string[];
}

export interface ExpectedAnswer {
  id: string;
  question: string;
  concepts: Concept[];
  relations: Relation[];
  rules: Rule[];
  functions: EvaluatedFunction[] | null;
}

export interface Rubric {
  id: string;
  acc_w: number;
  comp_w: number;
  log_w: number;
  description: string;
  created_at: string;
}

export interface Question {
  id: string;
  bloom_level: BloomLevel;
  content: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  rubric: Rubric;
  ex_ans: ExpectedAnswer;
  topic_id: string;
}

export interface Submission {
  user_id: string;
  question_id: string;
  type: QuestionType;
  submitted_text: string;
}

export interface ConceptEvalResult {
  concept: string;
  status: 'MATCHED' | 'MISSED';
  lexeme_found: string | null;
  error_message: string | null;
}

export interface RelationEvalResult {
  source_concept: Concept | null;
  relation_concept: Concept | null;
  relation_type: string;
  target_concept: Concept | null;
  status: 'MATCHED' | 'MISSED';
  matched_text: string | null;
  error_message: string | null;
}

export interface SynonymEval {
  concept: string;
  status: 'MATCHED' | 'MISSED';
  lexeme_found: string | null;
  error_message: string | null;
}

export interface RuleEvalResult {
  rule_name: string;
  score: number;
  weight: number;
  synonym_evaluation: SynonymEval[] | null;
  error_message: string | null;
}

export interface MatchedEvidence {
  concepts_evaluated: {
    match_percent: number;
    concept_evaluation_results: ConceptEvalResult[];
  } | null;
  relationships_evaluated: {
    pass_percent: number;
    relation_evaluation_results: RelationEvalResult[];
  } | null;
  rules_evaluated: {
    total_score: number;
    rule_evaluation_results: RuleEvalResult[];
  } | null;
  functions_evaluated: any | null;
}

export interface EvaluationResult {
  user_id: string;
  question_id: string;
  question_type: QuestionType;
  answer_id: string | null;
  score_earned: number; // Scale out of 10
  acc_score: number; // Scale 0-1
  comp_score: number; // Scale 0-1
  log_score: number; // Scale 0-1
  feedback_text: string | null;
  evaluated_at: string;
  matched_evidence: MatchedEvidence;
}

// Model for historical submission log
export interface SubmissionLog {
  id: string;
  questionId: string;
  questionTitle: string;
  topicId: string;
  submittedText: string;
  score: number;
  bloomLevel: BloomLevel;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  evaluatedAt: string;
  evaluationResult: EvaluationResult;
}

export interface UserSession {
  token: string;
  id: string;
  username: string;
  full_name: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface ExamQuestion {
  question: Question;
  maxScore: number;
  suggestedTime: number;
  sequenceOrder?: number;
}

export interface Exam {
  id?: string;
  title: string;
  difficulty: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED';
  totalTime: number;
  totalScore: number;
  questions?: Question[];
  customQuestions?: ExamQuestion[];
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  feedback: string;
  submittedAt: string;
}

export interface ExamSubmitResponse {
  examScore: number;
  examFeedback: string;
  questionResults: EvaluationResult[];
  examSubmissionId: string | null;
}
