import * as fs from 'fs';
import * as path from 'path';
import type { SessionReplay, SessionStep } from '../../types/replay.js';
import { getHermesHomeDir, readJsonlFileSafe } from '../agent-data-root.js';
import { log } from '../logger.js';
import { BaseParser, makeSessionId } from './base-parser.js';

type JsonRecord = Record<string, unknown>;

type HermesRole = 'assistant' | 'system' | 'tool' | 'user';

interface HermesMessageRecord {
  id?: string;
  sessionId: string;
  role: string;
  content: string;
  model?: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  createdAt?: unknown;
  reasoning?: string;
  toolName?: string;
  toolCallId?: string;
}

interface HermesSessionRecord {
  sessionId: string;
  title?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  source?: string;
  model?: string;
  messages: HermesMessageRecord[];
}

interface HermesSessionAccumulator extends HermesSessionRecord {
  messages: HermesMessageRecord[];
}

interface HermesFileParseResult {
  replays: SessionReplay[];
  sourceCount: number;
}

interface HermesFileCacheEntry extends HermesFileParseResult {
  mtimeMs: number;
}

interface HermesToolState {
  pendingIds: string[];
  lastByName: Map<string, string>;
}

type HermesContentSegment =
  | { kind: 'text'; value: string }
  | { kind: 'tool_call' | 'tool_response'; rawPayload: string; payload: JsonRecord | null };

const HERMES_SOURCE = 'hermes';
const TOOL_TAG_RE = /<(tool_call|tool_response)>([\s\S]*?)<\/\1>/gi;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function removePendingId(pendingIds: string[], id: string): void {
  const index = pendingIds.indexOf(id);
  if (index >= 0) pendingIds.splice(index, 1);
}

function safeFileStat(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

export class HermesParser extends BaseParser<HermesSessionRecord> {
  private fileCache = new Map<string, HermesFileCacheEntry>();
  private sourceCount = 0;
  private warnedMissingSqliteSupport = false;

  canHandle(source: string): boolean {
    return source.trim().toLowerCase() === HERMES_SOURCE;
  }

  getSourceCount(): number {
    return this.sourceCount;
  }

  loadReplays(): SessionReplay[] {
    const hermesHome = getHermesHomeDir();
    if (!hermesHome) {
      this.sourceCount = 0;
      this.fileCache.clear();
      return [];
    }

    const dbPath = path.join(hermesHome, 'hermes.db');
    const hasDatabase = Boolean(safeFileStat(dbPath)?.isFile());
    const exportFiles = this.findJsonlExports(hermesHome);
    const seenPaths = new Set<string>();
    const deduped = new Map<string, SessionReplay>();
    let sourceCount = 0;

    if (hasDatabase && exportFiles.length === 0 && !this.warnedMissingSqliteSupport) {
      log.info(
        '[hermes-parser] 检测到 hermes.db，但当前 server/package.json 未安装 better-sqlite3 或 sql.js；已退回 JSONL 导出解析。可先执行 hermes sessions export 导出会话。',
      );
      this.warnedMissingSqliteSupport = true;
    }

    for (const filePath of exportFiles) {
      seenPaths.add(filePath);
      const stat = safeFileStat(filePath);
      if (!stat?.isFile()) continue;

      const cached = this.fileCache.get(filePath);
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        sourceCount += cached.sourceCount;
        this.mergeReplays(deduped, cached.replays);
        continue;
      }

      const parsed = this.parseJsonlExport(filePath);
      this.fileCache.set(filePath, {
        mtimeMs: stat.mtimeMs,
        replays: parsed.replays,
        sourceCount: parsed.sourceCount,
      });
      sourceCount += parsed.sourceCount;
      this.mergeReplays(deduped, parsed.replays);
    }

    for (const key of this.fileCache.keys()) {
      if (!seenPaths.has(key)) this.fileCache.delete(key);
    }

    const replays = Array.from(deduped.values());
    this.sourceCount = Math.max(sourceCount, replays.length);
    return replays;
  }

  parse(data: HermesSessionRecord): SessionReplay {
    const steps = this.buildSessionSteps(data);
    if (steps.length === 0) {
      throw new Error(`Hermes session ${data.sessionId} 没有可展示的消息步骤`);
    }

    const agentName = this.resolveAgentName(data);
    const firstTimestamp = this.parseTimestamp(data.createdAt, steps[0]?.timestamp ?? new Date());
    const lastTimestamp = this.parseTimestamp(data.updatedAt, steps[steps.length - 1]?.timestamp ?? firstTimestamp);

    return this.buildReplay(
      {
        id: makeSessionId(HERMES_SOURCE, agentName, data.sessionId),
        agentName,
        dataSource: HERMES_SOURCE,
        summary: data.title,
        sessionLabel: data.title,
        startTime: firstTimestamp,
        endTime: lastTimestamp,
      },
      steps,
    );
  }

  private mergeReplays(target: Map<string, SessionReplay>, replays: SessionReplay[]): void {
    for (const replay of replays) {
      const existing = target.get(replay.meta.id);
      if (!existing || replay.meta.endTime.getTime() >= existing.meta.endTime.getTime()) {
        target.set(replay.meta.id, replay);
      }
    }
  }

  private findJsonlExports(rootDir: string): string[] {
    const out: string[] = [];
    const stack = [rootDir];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      let entries: string[];
      try {
        entries = fs.readdirSync(current);
      } catch {
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(current, entry);
        const stat = safeFileStat(fullPath);
        if (!stat) continue;
        if (stat.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (!stat.isFile()) continue;
        if (entry.toLowerCase().endsWith('.jsonl')) out.push(fullPath);
      }
    }

    out.sort((a, b) => {
      const sa = safeFileStat(a)?.mtimeMs ?? 0;
      const sb = safeFileStat(b)?.mtimeMs ?? 0;
      return sb - sa;
    });
    return out;
  }

  private parseJsonlExport(filePath: string): HermesFileParseResult {
    const readResult = readJsonlFileSafe(filePath);
    if (readResult.content == null) return { replays: [], sourceCount: 0 };

    const sessions = new Map<string, HermesSessionAccumulator>();
    const lines = readResult.content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index]?.trim();
      if (!rawLine) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawLine);
      } catch (error) {
        log.debug(`[hermes-parser] skipped malformed JSONL line in ${filePath}:`, (error as Error).message);
        continue;
      }

      const record = asRecord(parsed);
      if (!record) continue;

      const fullSession = this.normalizeFullSession(record);
      if (fullSession) {
        this.mergeSessionAccumulator(sessions, fullSession);
        continue;
      }

      const message = this.normalizeMessage(record);
      if (message) {
        const accumulator = this.ensureSessionAccumulator(sessions, message.sessionId);
        this.mergeSessionMetaFromRecord(accumulator, record);
        accumulator.messages.push(message);
        continue;
      }

      const sessionMeta = this.normalizeSessionMeta(record);
      if (sessionMeta) {
        this.mergeSessionAccumulator(sessions, sessionMeta);
      }
    }

    const replays: SessionReplay[] = [];
    for (const session of sessions.values()) {
      const messages = this.dedupeMessages(session.messages);
      if (messages.length === 0) continue;
      try {
        replays.push(this.parse({ ...session, messages }));
      } catch (error) {
        log.debug(`[hermes-parser] failed to parse session ${session.sessionId}:`, (error as Error).message);
      }
    }

    return { replays, sourceCount: replays.length };
  }

  private ensureSessionAccumulator(
    sessions: Map<string, HermesSessionAccumulator>,
    sessionId: string,
  ): HermesSessionAccumulator {
    const existing = sessions.get(sessionId);
    if (existing) return existing;
    const created: HermesSessionAccumulator = {
      sessionId,
      messages: [],
    };
    sessions.set(sessionId, created);
    return created;
  }

  private mergeSessionAccumulator(
    sessions: Map<string, HermesSessionAccumulator>,
    patch: Partial<HermesSessionRecord> & Pick<HermesSessionRecord, 'sessionId'>,
  ): void {
    const target = this.ensureSessionAccumulator(sessions, patch.sessionId);
    if (!target.title && patch.title) target.title = patch.title;
    if (target.createdAt == null && patch.createdAt != null) target.createdAt = patch.createdAt;
    if (target.updatedAt == null && patch.updatedAt != null) target.updatedAt = patch.updatedAt;
    if (!target.source && patch.source) target.source = patch.source;
    if (!target.model && patch.model) target.model = patch.model;
    if (patch.messages?.length) target.messages.push(...patch.messages);
  }

  private mergeSessionMetaFromRecord(target: HermesSessionAccumulator, record: JsonRecord): void {
    const sessionRecord = asRecord(record.session);
    if (!target.title) {
      target.title = pickString(record.title, record.name, sessionRecord?.title, sessionRecord?.name);
    }
    if (target.createdAt == null) {
      target.createdAt =
        record.created_at ?? record.createdAt ?? sessionRecord?.created_at ?? sessionRecord?.createdAt ?? target.createdAt;
    }
    if (target.updatedAt == null) {
      target.updatedAt =
        record.updated_at ?? record.updatedAt ?? sessionRecord?.updated_at ?? sessionRecord?.updatedAt ?? target.updatedAt;
    }
    if (!target.source) {
      target.source = pickString(record.source, record.platform, sessionRecord?.source, sessionRecord?.platform);
    }
    if (!target.model) {
      target.model = pickString(record.model, sessionRecord?.model);
    }
  }

  private normalizeFullSession(record: JsonRecord): HermesSessionRecord | null {
    const sessionRecord = asRecord(record.session);
    const messageList = Array.isArray(record.messages)
      ? record.messages
      : Array.isArray(sessionRecord?.messages)
        ? sessionRecord.messages
        : null;
    if (!messageList) return null;

    const sessionId = pickString(record.session_id, record.sessionId, record.id, sessionRecord?.id, sessionRecord?.session_id);
    if (!sessionId) return null;

    const messages = messageList
      .map((message, index) => {
        const messageRecord = asRecord(message);
        if (!messageRecord) return null;
        return this.normalizeMessage(messageRecord, sessionId, index);
      })
      .filter((message): message is HermesMessageRecord => message != null);

    return {
      sessionId,
      title: pickString(record.title, record.name, sessionRecord?.title, sessionRecord?.name),
      createdAt: record.created_at ?? record.createdAt ?? sessionRecord?.created_at ?? sessionRecord?.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt ?? sessionRecord?.updated_at ?? sessionRecord?.updatedAt,
      source: pickString(record.source, record.platform, sessionRecord?.source, sessionRecord?.platform),
      model: pickString(record.model, sessionRecord?.model),
      messages,
    };
  }

  private normalizeSessionMeta(record: JsonRecord): (Partial<HermesSessionRecord> & { sessionId: string }) | null {
    const sessionRecord = asRecord(record.session);
    const sessionId = pickString(record.session_id, record.sessionId, sessionRecord?.id, sessionRecord?.session_id, record.id);
    if (!sessionId) return null;
    if (record.content != null || record.role != null || record.messages != null) return null;

    return {
      sessionId,
      title: pickString(record.title, record.name, sessionRecord?.title, sessionRecord?.name),
      createdAt: record.created_at ?? record.createdAt ?? sessionRecord?.created_at ?? sessionRecord?.createdAt,
      updatedAt: record.updated_at ?? record.updatedAt ?? sessionRecord?.updated_at ?? sessionRecord?.updatedAt,
      source: pickString(record.source, record.platform, sessionRecord?.source, sessionRecord?.platform),
      model: pickString(record.model, sessionRecord?.model),
    };
  }

  private normalizeMessage(record: JsonRecord, fallbackSessionId?: string, fallbackIndex?: number): HermesMessageRecord | null {
    const sessionRecord = asRecord(record.session);
    const sessionId = pickString(record.session_id, record.sessionId, sessionRecord?.id, sessionRecord?.session_id, fallbackSessionId);
    const role = pickString(record.role, record.type, record.kind);
    const content = record.content ?? record.text ?? record.message ?? record.body;

    if (!sessionId || !role || content == null) return null;

    return {
      id: pickString(record.id, record.message_id, record.messageId) ?? (fallbackIndex != null ? `msg-${fallbackIndex}` : undefined),
      sessionId,
      role,
      content: this.stringify(content),
      model: pickString(record.model, sessionRecord?.model),
      tokensUsed: pickNumber(record.tokens_used, record.tokensUsed, record.token_count, record.tokenCount),
      createdAt: record.created_at ?? record.createdAt ?? record.timestamp,
      reasoning: pickString(record.reasoning, record.reasoning_content, record.thinking),
      toolName: pickString(record.tool_name, record.toolName, record.name),
      toolCallId: pickString(record.tool_call_id, record.toolCallId, record.call_id, record.callId),
    };
  }

  private dedupeMessages(messages: HermesMessageRecord[]): HermesMessageRecord[] {
    const seen = new Set<string>();
    const out: HermesMessageRecord[] = [];
    for (const message of messages) {
      const key =
        message.id ??
        `${message.role}:${String(message.createdAt ?? '')}:${message.toolCallId ?? ''}:${message.content}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(message);
    }
    return out;
  }

  private resolveAgentName(session: HermesSessionRecord): string {
    return pickString(session.source, HERMES_SOURCE) ?? HERMES_SOURCE;
  }

  private buildSessionSteps(session: HermesSessionRecord): SessionStep[] {
    const steps: SessionStep[] = [];
    const toolState: HermesToolState = {
      pendingIds: [],
      lastByName: new Map<string, string>(),
    };
    let lastTimestamp = this.parseTimestamp(session.createdAt, new Date());

    for (const message of session.messages) {
      const timestamp = this.parseTimestamp(message.createdAt, lastTimestamp);
      const batch = this.messageToSteps(session, message, steps.length, timestamp, toolState);
      if (batch.length > 0) {
        lastTimestamp = batch[batch.length - 1]?.timestamp ?? timestamp;
        steps.push(...batch);
      }
    }

    return steps;
  }

  private messageToSteps(
    session: HermesSessionRecord,
    message: HermesMessageRecord,
    startIndex: number,
    timestamp: Date,
    toolState: HermesToolState,
  ): SessionStep[] {
    const role = this.normalizeRole(message.role);
    const model = message.model ?? session.model;
    const tokensUsed = message.tokensUsed ?? 0;
    const segments = this.splitContentSegments(message.content);
    let reasoningPending = message.reasoning?.trim() ?? '';
    const steps: SessionStep[] = [];

    const pushStep = (step: SessionStep) => {
      steps.push(step);
    };

    const consumeReasoning = (): string => {
      const reasoning = reasoningPending;
      reasoningPending = '';
      return reasoning;
    };

    const pushTextStep = (type: SessionStep['type'], text: string, contentModel?: string) => {
      const stepContent = this.buildStepContent(text, consumeReasoning());
      pushStep(
        this.createStep({
          index: startIndex + steps.length,
          timestamp,
          type,
          ...stepContent,
          ...(contentModel ? { model: contentModel } : {}),
          inputTokens: 0,
          outputTokens: 0,
        }),
      );
    };

    if (role === 'user') {
      const text = this.extractPlainText(message.content).trim();
      if (text) pushTextStep('user', text);
      this.assignUsage(steps, role, tokensUsed, message);
      return steps;
    }

    if (role === 'assistant') {
      if (segments.length === 0) {
        const plainText = message.content.trim();
        if (plainText) {
          pushTextStep('response', plainText, model);
        } else if (reasoningPending) {
          pushTextStep('thinking', reasoningPending, model);
        }
        this.assignUsage(steps, role, tokensUsed, message);
        return steps;
      }

      for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex]!;
        if (segment.kind === 'text') {
          if (segment.value) pushTextStep('response', segment.value, model);
          continue;
        }

        if (segment.kind === 'tool_call') {
          const toolStep = this.createToolCallStep(
            session,
            message,
            segment.payload,
            segment.rawPayload,
            timestamp,
            startIndex + steps.length,
            toolState,
            model,
            consumeReasoning(),
            segmentIndex,
          );
          pushStep(toolStep);
          continue;
        }

        const toolResultStep = this.createToolResultStep(
          message,
          segment.payload,
          segment.rawPayload,
          timestamp,
          startIndex + steps.length,
          toolState,
          model,
          consumeReasoning(),
        );
        pushStep(toolResultStep);
      }

      if (steps.length === 0 && reasoningPending) {
        pushTextStep('thinking', reasoningPending, model);
      }
      this.assignUsage(steps, role, tokensUsed, message);
      return steps;
    }

    if (role === 'tool') {
      const toolSegments: HermesContentSegment[] = segments.length > 0 ? segments : [{ kind: 'text', value: message.content.trim() }];
      for (const segment of toolSegments) {
        if (segment.kind === 'tool_call') {
          const toolStep = this.createToolCallStep(
            session,
            message,
            segment.payload,
            segment.rawPayload,
            timestamp,
            startIndex + steps.length,
            toolState,
            model,
            consumeReasoning(),
          );
          pushStep(toolStep);
        } else if (segment.kind === 'tool_response') {
          const toolResultStep = this.createToolResultStep(
            message,
            segment.payload,
            segment.rawPayload,
            timestamp,
            startIndex + steps.length,
            toolState,
            model,
            consumeReasoning(),
          );
          pushStep(toolResultStep);
        } else {
          const text = 'value' in segment ? segment.value.trim() : '';
          if (!text) continue;
          const resolvedToolName = message.toolName;
          let resolvedToolCallId = message.toolCallId;
          if (!resolvedToolCallId && resolvedToolName) {
            resolvedToolCallId = toolState.lastByName.get(resolvedToolName);
          }
          if (!resolvedToolCallId) {
            resolvedToolCallId = toolState.pendingIds[0];
          }
          if (resolvedToolCallId) removePendingId(toolState.pendingIds, resolvedToolCallId);
          const stepContent = this.buildStepContent(text, consumeReasoning());
          pushStep(
            this.createStep({
              index: startIndex + steps.length,
              timestamp,
              type: 'tool_result',
              ...stepContent,
              ...(model ? { model } : {}),
              ...(resolvedToolName ? { toolName: resolvedToolName } : {}),
              ...(resolvedToolCallId ? { toolCallId: resolvedToolCallId } : {}),
              toolOutput: text,
              inputTokens: 0,
              outputTokens: 0,
            }),
          );
        }
      }
      this.assignUsage(steps, role, tokensUsed, message);
      return steps;
    }

    const fallbackText = this.extractPlainText(message.content).trim();
    if (fallbackText) {
      pushTextStep('system', fallbackText, model);
    } else if (reasoningPending) {
      pushTextStep('thinking', reasoningPending, model);
    }
    this.assignUsage(steps, role, tokensUsed, message);
    return steps;
  }

  private normalizeRole(role: string): HermesRole {
    const normalized = role.trim().toLowerCase();
    if (normalized === 'user' || normalized === 'human') return 'user';
    if (normalized === 'tool' || normalized === 'tool_result' || normalized === 'toolresponse') return 'tool';
    if (normalized === 'system' || normalized === 'developer') return 'system';
    return 'assistant';
  }

  private assignUsage(steps: SessionStep[], role: HermesRole, tokensUsed: number, message?: HermesMessageRecord): void {
    if (steps.length === 0) return;
    
    // 优先使用明确的 input/output token 字段
    const explicitInput = message?.inputTokens ?? message?.input_tokens ?? message?.prompt_tokens;
    const explicitOutput = message?.outputTokens ?? message?.output_tokens ?? message?.completion_tokens;
    
    if (explicitInput != null && explicitInput > 0) {
      steps[0]!.inputTokens = explicitInput;
    }
    if (explicitOutput != null && explicitOutput > 0) {
      steps[0]!.outputTokens = explicitOutput;
    }
    
    // 如果已经有明确的 token 分配，直接返回
    if ((explicitInput != null && explicitInput > 0) || (explicitOutput != null && explicitOutput > 0)) {
      return;
    }
    
    // 回退到 tokensUsed 的启发式分配
    if (tokensUsed <= 0) return;
    
    if (role === 'user') {
      steps[0]!.inputTokens = tokensUsed;
    } else {
      // assistant 或 tool 角色
      const stepType = steps[0]?.type;
      if (stepType === 'user' || stepType === 'tool_call') {
        steps[0]!.inputTokens = tokensUsed;
      } else if (stepType === 'response' || stepType === 'tool_result' || stepType === 'thinking') {
        steps[0]!.outputTokens = tokensUsed;
      } else {
        // 无法判断，各占 50%
        steps[0]!.inputTokens = Math.floor(tokensUsed / 2);
        steps[0]!.outputTokens = tokensUsed - steps[0]!.inputTokens;
      }
    }
  }

  private extractPlainText(content: string): string {
    return content.replace(TOOL_TAG_RE, ' ').replace(/\s+/g, ' ').trim();
  }

  private splitContentSegments(content: string): HermesContentSegment[] {
    const segments: HermesContentSegment[] = [];
    const regex = new RegExp(TOOL_TAG_RE);
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) != null) {
      const leading = content.slice(lastIndex, match.index).trim();
      if (leading) segments.push({ kind: 'text', value: leading });

      const rawPayload = (match[2] ?? '').trim();
      const kind = match[1]?.toLowerCase() === 'tool_response' ? 'tool_response' : 'tool_call';
      segments.push({
        kind,
        rawPayload,
        payload: this.parseTaggedPayload(rawPayload),
      });
      lastIndex = regex.lastIndex;
    }

    const trailing = content.slice(lastIndex).trim();
    if (trailing) segments.push({ kind: 'text', value: trailing });
    return segments;
  }

  private parseTaggedPayload(rawPayload: string): JsonRecord | null {
    if (!rawPayload) return null;
    const decoded = this.decodeXmlEntities(rawPayload);
    try {
      const parsed = JSON.parse(decoded) as unknown;
      const record = asRecord(parsed);
      if (record) return record;
      return { value: parsed };
    } catch {
      return null;
    }
  }

  private decodeXmlEntities(value: string): string {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  private createToolCallStep(
    session: HermesSessionRecord,
    message: HermesMessageRecord,
    payload: JsonRecord | null,
    rawPayload: string,
    timestamp: Date,
    index: number,
    toolState: HermesToolState,
    model?: string,
    reasoning?: string,
    segmentIndex = 0,
  ): SessionStep {
    const functionRecord = asRecord(payload?.function);
    const toolName = pickString(payload?.name, payload?.tool_name, functionRecord?.name, message.toolName, 'tool') ?? 'tool';
    const toolCallId =
      pickString(payload?.id, payload?.tool_call_id, payload?.call_id, message.toolCallId) ??
      this.syntheticToolCallId(session.sessionId, message.id, segmentIndex);
    const rawArguments = payload?.arguments ?? functionRecord?.arguments ?? payload?.input ?? payload?.params ?? rawPayload;
    const toolInput = typeof rawArguments === 'string' ? rawArguments : this.stringify(rawArguments);
    toolState.pendingIds.push(toolCallId);
    toolState.lastByName.set(toolName, toolCallId);
    const stepContent = this.buildStepContent('', reasoning ?? '');

    return this.createStep({
      index,
      timestamp,
      type: 'tool_call',
      ...stepContent,
      ...(model ? { model } : {}),
      toolName,
      toolInput,
      toolCallId,
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  private createToolResultStep(
    message: HermesMessageRecord,
    payload: JsonRecord | null,
    rawPayload: string,
    timestamp: Date,
    index: number,
    toolState: HermesToolState,
    model?: string,
    reasoning?: string,
  ): SessionStep {
    const toolName = pickString(payload?.name, payload?.tool_name, message.toolName);
    let toolCallId = pickString(payload?.tool_call_id, payload?.call_id, payload?.id, message.toolCallId);
    if (!toolCallId && toolName) {
      toolCallId = toolState.lastByName.get(toolName);
    }
    if (!toolCallId) {
      toolCallId = toolState.pendingIds[0];
    }
    if (toolCallId) removePendingId(toolState.pendingIds, toolCallId);

    const errorText = this.stringify(payload?.error ?? payload?.err);
    const hasStructuredResult =
      payload?.result != null || payload?.output != null || payload?.content != null || payload?.value != null;
    const payloadKeys = payload ? Object.keys(payload).filter(key => payload[key] != null) : [];
    const onlyErrorPayload =
      Boolean(errorText) &&
      !hasStructuredResult &&
      payloadKeys.length > 0 &&
      payloadKeys.every(
        key =>
          key === 'error' ||
          key === 'err' ||
          key === 'name' ||
          key === 'tool_name' ||
          key === 'tool_call_id' ||
          key === 'call_id' ||
          key === 'id',
      );
    const resultValue = onlyErrorPayload
      ? payload?.error ?? payload?.err
      : payload?.result ?? payload?.output ?? payload?.content ?? payload?.value ?? rawPayload;
    const toolOutput = this.stringify(resultValue);
    const resolvedToolOutput = toolOutput || errorText || rawPayload;
    const stepContent = this.buildStepContent(resolvedToolOutput, reasoning ?? '');

    return this.createStep({
      index,
      timestamp,
      type: 'tool_result',
      ...stepContent,
      ...(model ? { model } : {}),
      ...(toolName ? { toolName } : {}),
      ...(toolCallId ? { toolCallId } : {}),
      toolOutput: resolvedToolOutput,
      ...(errorText ? { error: errorText, isError: true } : {}),
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  private syntheticToolCallId(sessionId: string, messageId?: string, segmentIndex = 0): string {
    const base = messageId?.trim() ? messageId.trim() : 'message';
    return `hermes-${sessionId}-${base}-${segmentIndex}`;
  }
}

export const hermesParser = new HermesParser();

/**
 * SQLite 直读路径说明：
 * 当前工作区 package.json 未安装 better-sqlite3 / sql.js，因此这里只启用 `hermes sessions export`
 * 产出的 JSONL 解析。若后续补上依赖，可在 loadReplays() 中优先读取 ~/.hermes/hermes.db 的
 * sessions / messages 表，再复用 HermesParser.parse() 输出统一 SessionReplay。
 */
