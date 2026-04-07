import type { CostMeta } from './index.js';

/** 评测维度 */
export type BenchmarkDimension =
  | 'writing'
  | 'coding'
  | 'toolUse'
  | 'search'
  | 'safety'
  | 'costEfficiency';

export interface DimensionScore {
  dimension: BenchmarkDimension;
  label: string;
  labelEn?: string;
  score: number; // 0-100
  maxScore: 100;
  details: string;
  detailsEn?: string;
  evidence?: string;
  evidenceEn?: string;
}

export interface BenchmarkResult {
  id: string;
  runAt: Date;
  overallScore: number; // 0-100
  rank: string; // "S" | "A" | "B" | "C" | "D"
  dimensions: DimensionScore[];
  totalSessions: number;
  totalTokens: number;
  totalCost: number;
  avgCostPerSession: number;
  topModel: string;
  summary: string;
  summaryEn?: string;
  dataSource?: 'demo' | 'real';
  costMeta?: CostMeta;
}

export interface BenchmarkHistory {
  results: BenchmarkResult[];
}

export const DIMENSION_LABELS: Record<BenchmarkDimension, string> = {
  writing: '写作能力',
  coding: '代码能力',
  toolUse: '工具调用',
  search: '信息检索',
  safety: '安全合规',
  costEfficiency: '性价比',
};

export const DIMENSION_LABELS_EN: Record<BenchmarkDimension, string> = {
  writing: 'Writing',
  coding: 'Coding',
  toolUse: 'Tool Use',
  search: 'Retrieval',
  safety: 'Safety',
  costEfficiency: 'Cost Efficiency',
};
