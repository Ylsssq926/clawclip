export interface KeywordItem {
  word: string;
  count: number;
  category: 'tool' | 'topic' | 'model' | 'action' | 'other';
}

export interface TagInfo {
  tag: string;
  sessionCount: number;
  color: string;
}

export interface WordCloudData {
  keywords: KeywordItem[];
  totalSessions: number;
  analyzedSteps: number;
}

export interface SessionTagMap {
  [sessionId: string]: string[];
}
