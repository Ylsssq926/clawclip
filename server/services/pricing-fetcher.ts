import fs from 'fs';
import path from 'path';
import {
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_MODEL_PRICING,
  DEFAULT_DETAILED_PRICING,
  PRICING_REFERENCES,
  PRICING_SOURCES,
  type BudgetConfig,
  type ModelPricing,
  type DetailedModelPricing,
  type PricingMode,
  type PricingReference,
  type PricingSource,
} from '../types/index.js';
import { getClawclipStateDir } from './agent-data-root.js';
import { log } from './logger.js';

const PRICETOKEN_URL = 'https://pricetoken.ai/api/v1/text';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 8000;
const STATIC_DEFAULT_PRICING_UPDATED_AT = '2026-03-25T00:00:00.000Z';
const PRICING_MODE: PricingMode = 'detailed-input-output-v1';
const DYNAMIC_REFERENCES = ['pricetoken', 'openrouter'] as const;
type DynamicPricingReference = (typeof DYNAMIC_REFERENCES)[number];
const DATE_SUFFIX_RE = /-(?:\d{8}|\d{4}-\d{2}-\d{2})$/;
const PRICING_REFERENCE_SET = new Set<PricingReference>(PRICING_REFERENCES);
const PRICING_SOURCE_SET = new Set<PricingSource>(PRICING_SOURCES);
const DYNAMIC_REFERENCE_SET = new Set<DynamicPricingReference>(DYNAMIC_REFERENCES);

export interface PricingSnapshot {
  pricing: ModelPricing;
  detailed: DetailedModelPricing;
  reference: PricingReference;
  source: PricingSource;
  updatedAt: string;
  catalogVersion: string;
  stale: boolean;
  pricingMode: PricingMode;
}

interface CachedPricing {
  pricing: ModelPricing;
  detailed: DetailedModelPricing;
  fetchedAt: number;
  source: PricingSource;
}

interface PriceTokenModel {
  modelId: string;
  provider: string;
  displayName?: string;
  inputPerMTok: number;
  outputPerMTok: number;
}

interface PriceTokenResponse {
  data: PriceTokenModel[];
}

interface OpenRouterModel {
  id?: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

interface RemotePricingEntry {
  modelId: string;
  inputPerMTok: number;
  outputPerMTok: number;
}

const cached: Partial<Record<DynamicPricingReference, CachedPricing>> = {};
const fetching: Partial<Record<DynamicPricingReference, Promise<void> | null>> = {};

export function isPricingReference(value: unknown): value is PricingReference {
  return typeof value === 'string' && PRICING_REFERENCE_SET.has(value as PricingReference);
}

export function isPricingSource(value: unknown): value is PricingSource {
  return typeof value === 'string' && PRICING_SOURCE_SET.has(value as PricingSource);
}

function isDynamicPricingReference(value: PricingReference): value is DynamicPricingReference {
  return DYNAMIC_REFERENCE_SET.has(value as DynamicPricingReference);
}

function configPath(): string {
  return path.join(getClawclipStateDir(), 'config.json');
}

export function readBudgetConfigFromState(): BudgetConfig {
  const base: BudgetConfig = { ...DEFAULT_BUDGET_CONFIG };

  try {
    const filePath = configPath();
    if (!fs.existsSync(filePath)) return base;

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<BudgetConfig>;
    const monthly = typeof raw.monthly === 'number' && raw.monthly > 0 ? raw.monthly : base.monthly;
    const alertThreshold =
      typeof raw.alertThreshold === 'number' && raw.alertThreshold >= 1 && raw.alertThreshold <= 100
        ? raw.alertThreshold
        : base.alertThreshold;
    const currency = typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency : base.currency;
    const pricingReference = isPricingReference(raw.pricingReference)
      ? raw.pricingReference
      : (base.pricingReference ?? 'pricetoken');

    return {
      monthly,
      alertThreshold,
      currency,
      pricingReference,
    };
  } catch {
    return base;
  }
}

export function getConfiguredPricingReference(): PricingReference {
  return readBudgetConfigFromState().pricingReference ?? 'pricetoken';
}

function resolvePricingReference(reference?: PricingReference): PricingReference {
  return reference ?? getConfiguredPricingReference();
}

function addUnique(target: string[], value: string | undefined): void {
  if (!value) return;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized || target.includes(normalized)) return;
  target.push(normalized);
}

export function normalizeModelId(raw: string): string[] {
  const variants: string[] = [];
  const slug = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!slug) return variants;

  const withoutFree = slug.replace(/:free$/, '');
  const withoutQualifier = withoutFree.replace(/:.*$/, '');
  const tail = withoutFree.split('/').filter(Boolean).pop() ?? '';
  const tailWithoutQualifier = tail.replace(/:.*$/, '');

  addUnique(variants, slug);
  addUnique(variants, withoutFree);
  addUnique(variants, withoutQualifier);
  addUnique(variants, withoutFree.replace(DATE_SUFFIX_RE, ''));
  addUnique(variants, withoutQualifier.replace(DATE_SUFFIX_RE, ''));
  addUnique(variants, tail);
  addUnique(variants, tailWithoutQualifier);
  addUnique(variants, tail.replace(DATE_SUFFIX_RE, ''));
  addUnique(variants, tailWithoutQualifier.replace(DATE_SUFFIX_RE, ''));

  return variants;
}

function buildPricingMap(entries: RemotePricingEntry[]): ModelPricing {
  const map: ModelPricing = { ...DEFAULT_MODEL_PRICING };

  for (const entry of entries) {
    if (!Number.isFinite(entry.outputPerMTok) || entry.outputPerMTok < 0) continue;
    for (const id of normalizeModelId(entry.modelId)) {
      map[id] = entry.outputPerMTok;
    }
  }

  return map;
}

function buildDetailedPricingMap(entries: RemotePricingEntry[]): DetailedModelPricing {
  const map: DetailedModelPricing = { ...DEFAULT_DETAILED_PRICING };

  for (const entry of entries) {
    if (!Number.isFinite(entry.outputPerMTok) || entry.outputPerMTok < 0) continue;
    const input =
      Number.isFinite(entry.inputPerMTok) && entry.inputPerMTok >= 0
        ? entry.inputPerMTok
        : entry.outputPerMTok;
    for (const id of normalizeModelId(entry.modelId)) {
      map[id] = { input, output: entry.outputPerMTok };
    }
  }

  return map;
}

function buildSnapshot(
  pricing: ModelPricing,
  detailed: DetailedModelPricing,
  reference: PricingReference,
  source: PricingSource,
  updatedAt: string,
  stale: boolean,
): PricingSnapshot {
  return {
    pricing,
    detailed,
    reference,
    source,
    updatedAt,
    catalogVersion: `${reference}/${source}@${updatedAt}`,
    stale,
    pricingMode: PRICING_MODE,
  };
}

function getStaticSnapshot(reference: PricingReference = 'official-static'): PricingSnapshot {
  return buildSnapshot(
    DEFAULT_MODEL_PRICING,
    DEFAULT_DETAILED_PRICING,
    reference,
    'static-default',
    STATIC_DEFAULT_PRICING_UPDATED_AT,
    false,
  );
}

function getCachedSnapshot(reference: DynamicPricingReference, now = Date.now()): PricingSnapshot | null {
  const entry = cached[reference];
  if (!entry) return null;
  const updatedAt = new Date(entry.fetchedAt).toISOString();
  const stale = now - entry.fetchedAt >= CACHE_TTL_MS;
  return buildSnapshot(entry.pricing, entry.detailed, reference, entry.source, updatedAt, stale);
}

function parseUsdPerTokenToPerMillion(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value * 1_000_000;
}

function mapPriceTokenEntries(models: PriceTokenModel[]): RemotePricingEntry[] {
  return models
    .filter(model => typeof model.modelId === 'string' && model.modelId.trim())
    .map(model => ({
      modelId: model.modelId,
      inputPerMTok:
        typeof model.inputPerMTok === 'number' && model.inputPerMTok >= 0
          ? model.inputPerMTok
          : model.outputPerMTok,
      outputPerMTok: model.outputPerMTok,
    }))
    .filter(model => Number.isFinite(model.outputPerMTok) && model.outputPerMTok >= 0);
}

function mapOpenRouterEntries(models: OpenRouterModel[]): RemotePricingEntry[] {
  return models
    .map(model => {
      const modelId = typeof model.id === 'string' ? model.id : '';
      const outputPerMTok =
        parseUsdPerTokenToPerMillion(model.pricing?.completion) ?? parseUsdPerTokenToPerMillion(model.pricing?.prompt);
      const inputPerMTok =
        parseUsdPerTokenToPerMillion(model.pricing?.prompt) ?? outputPerMTok;
      return { modelId, inputPerMTok: inputPerMTok ?? -1, outputPerMTok: outputPerMTok ?? -1 };
    })
    .filter(model => model.modelId && Number.isFinite(model.outputPerMTok) && model.outputPerMTok >= 0);
}

async function fetchRemoteEntries(reference: DynamicPricingReference, signal: AbortSignal): Promise<RemotePricingEntry[]> {
  if (reference === 'pricetoken') {
    const res = await fetch(PRICETOKEN_URL, { signal });
    if (!res.ok) throw new Error(`PriceToken ${res.status}`);
    const json = (await res.json()) as PriceTokenResponse;
    if (!Array.isArray(json?.data) || json.data.length === 0) {
      throw new Error('PriceToken returned empty data');
    }
    return mapPriceTokenEntries(json.data);
  }

  const res = await fetch(OPENROUTER_MODELS_URL, { signal });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const json = (await res.json()) as OpenRouterResponse;
  if (!Array.isArray(json?.data) || json.data.length === 0) {
    throw new Error('OpenRouter returned empty data');
  }
  return mapOpenRouterEntries(json.data);
}

async function doFetch(reference: DynamicPricingReference): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const entries = await fetchRemoteEntries(reference, controller.signal);
    if (entries.length === 0) {
      throw new Error(`${reference} returned no valid pricing entries`);
    }

    cached[reference] = {
      pricing: buildPricingMap(entries),
      detailed: buildDetailedPricingMap(entries),
      fetchedAt: Date.now(),
      source: reference,
    };
    log.info(`[pricing-fetcher] loaded ${entries.length} models from ${reference}`);
  } catch (err) {
    log.warn(`[pricing-fetcher] ${reference} failed, using previous cache/static fallback:`, (err as Error).message);
  } finally {
    clearTimeout(timer);
    fetching[reference] = null;
  }
}

function ensureFetch(reference: DynamicPricingReference): Promise<void> {
  if (!fetching[reference]) {
    fetching[reference] = doFetch(reference);
  }
  return fetching[reference] as Promise<void>;
}

export function getPricingSnapshot(reference?: PricingReference): PricingSnapshot {
  const resolvedReference = resolvePricingReference(reference);
  if (!isDynamicPricingReference(resolvedReference)) {
    return getStaticSnapshot(resolvedReference);
  }

  const cachedSnapshot = getCachedSnapshot(resolvedReference);
  if (cachedSnapshot) {
    if (cachedSnapshot.stale) {
      void ensureFetch(resolvedReference);
    }
    return cachedSnapshot;
  }

  void ensureFetch(resolvedReference);
  return getStaticSnapshot(resolvedReference);
}

export async function getPricingSnapshotAsync(reference?: PricingReference): Promise<PricingSnapshot> {
  const resolvedReference = resolvePricingReference(reference);
  if (!isDynamicPricingReference(resolvedReference)) {
    return getStaticSnapshot(resolvedReference);
  }

  const cachedSnapshot = getCachedSnapshot(resolvedReference);
  if (cachedSnapshot && !cachedSnapshot.stale) {
    return cachedSnapshot;
  }

  await ensureFetch(resolvedReference);
  return getCachedSnapshot(resolvedReference) ?? getStaticSnapshot(resolvedReference);
}

export function getModelPricing(reference?: PricingReference): ModelPricing {
  return getPricingSnapshot(reference).pricing;
}

export async function getModelPricingAsync(reference?: PricingReference): Promise<ModelPricing> {
  return (await getPricingSnapshotAsync(reference)).pricing;
}

export function initPricingFetcher(): void {
  const reference = getConfiguredPricingReference();
  if (isDynamicPricingReference(reference)) {
    void ensureFetch(reference);
  }
}

export function getDetailedModelPricing(reference?: PricingReference): DetailedModelPricing {
  return getPricingSnapshot(reference).detailed;
}

export async function getDetailedModelPricingAsync(reference?: PricingReference): Promise<DetailedModelPricing> {
  return (await getPricingSnapshotAsync(reference)).detailed;
}
