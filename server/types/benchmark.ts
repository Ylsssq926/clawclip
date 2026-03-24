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
  label: string; // 中文标签
  score: number; // 0-100
  maxScore: 100;
  details: string; // 评分依据说明
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
  summary: string; // 一句话总结，龙虾口吻
}

export interface BenchmarkHistory {
  results: BenchmarkResult[];
}

export const DIMENSION_LABELS: Record<BenchmarkDimension, string> = {
  writing: '中文写作',
  coding: '代码能力',
  toolUse: '工具调用',
  search: '信息检索',
  safety: '安全合规',
  costEfficiency: '性价比',
};
