import {
  DEFAULT_MODEL_PRICING,
  DEFAULT_DETAILED_PRICING,
  type ModelPricing,
  type DetailedModelPricing,
  type PricingMode,
  type PricingSource,
} from '../types/index.js';
import { log } from './logger.js';

const PRICETOKEN_URL = 'https://pricetoken.ai/api/v1/text';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 8000;
const STATIC_DEFAULT_PRICING_UPDATED_AT = '2026-03-25T00:00:00.000Z';
const PRICING_MODE: PricingMode = 'detailed-input-output-v1';

export interface PricingSnapshot {
  pricing: ModelPricing;
  detailed: DetailedModelPricing;
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

let cached: CachedPricing | null = null;
let fetching: Promise<void> | null = null;

function normalizeModelId(raw: string): string[] {
  const ids: string[] = [];
  const slug = raw.toLowerCase().replace(/[^a-z0-9.\-]/g, '');
  ids.push(slug);

  const noDate = slug.replace(/-\d{8}$/, '');
  if (noDate !== slug) ids.push(noDate);

  return ids;
}

function buildPricingMap(models: PriceTokenModel[]): ModelPricing {
  const map: ModelPricing = { ...DEFAULT_MODEL_PRICING };

  for (const m of models) {
    if (typeof m.outputPerMTok !== 'number' || m.outputPerMTok < 0) continue;
    const price = m.outputPerMTok;
    for (const id of normalizeModelId(m.modelId)) {
      map[id] = price;
    }
  }

  return map;
}

function buildDetailedPricingMap(models: PriceTokenModel[]): DetailedModelPricing {
  const map: DetailedModelPricing = { ...DEFAULT_DETAILED_PRICING };

  for (const m of models) {
    if (typeof m.outputPerMTok !== 'number' || m.outputPerMTok < 0) continue;
    const input = typeof m.inputPerMTok === 'number' && m.inputPerMTok >= 0 ? m.inputPerMTok : m.outputPerMTok;
    for (const id of normalizeModelId(m.modelId)) {
      map[id] = { input, output: m.outputPerMTok };
    }
  }

  return map;
}

function buildSnapshot(
  pricing: ModelPricing,
  detailed: DetailedModelPricing,
  source: PricingSource,
  updatedAt: string,
  stale: boolean,
): PricingSnapshot {
  return {
    pricing,
    detailed,
    source,
    updatedAt,
    catalogVersion: `${source}@${updatedAt}`,
    stale,
    pricingMode: PRICING_MODE,
  };
}

function getStaticSnapshot(): PricingSnapshot {
  return buildSnapshot(
    DEFAULT_MODEL_PRICING,
    DEFAULT_DETAILED_PRICING,
    'static-default',
    STATIC_DEFAULT_PRICING_UPDATED_AT,
    false,
  );
}

function getCachedSnapshot(now = Date.now()): PricingSnapshot | null {
  if (!cached) return null;
  const updatedAt = new Date(cached.fetchedAt).toISOString();
  const stale = now - cached.fetchedAt >= CACHE_TTL_MS;
  return buildSnapshot(cached.pricing, cached.detailed, 'pricetoken', updatedAt, stale);
}

async function doFetch(): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(PRICETOKEN_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`PriceToken ${res.status}`);
    const json = (await res.json()) as PriceTokenResponse;

    if (!Array.isArray(json?.data) || json.data.length === 0) {
      throw new Error('PriceToken returned empty data');
    }

    const pricing = buildPricingMap(json.data);
    const detailed = buildDetailedPricingMap(json.data);
    cached = { pricing, detailed, fetchedAt: Date.now() };
    log.info(`[pricing-fetcher] loaded ${json.data.length} models from PriceToken`);
  } catch (err) {
    log.warn('[pricing-fetcher] failed, using previous cache/static fallback:', (err as Error).message);
  } finally {
    clearTimeout(timer);
    fetching = null;
  }
}

export function getPricingSnapshot(): PricingSnapshot {
  const cachedSnapshot = getCachedSnapshot();
  if (cachedSnapshot) {
    if (cachedSnapshot.stale && !fetching) {
      fetching = doFetch();
    }
    return cachedSnapshot;
  }

  if (!fetching) {
    fetching = doFetch();
  }

  return getStaticSnapshot();
}

export function getModelPricing(): ModelPricing {
  return getPricingSnapshot().pricing;
}

export async function getModelPricingAsync(): Promise<ModelPricing> {
  const cachedSnapshot = getCachedSnapshot();
  if (cachedSnapshot && !cachedSnapshot.stale) {
    return cachedSnapshot.pricing;
  }

  if (!fetching) {
    fetching = doFetch();
  }

  await fetching;
  return cached?.pricing ?? DEFAULT_MODEL_PRICING;
}

export function initPricingFetcher(): void {
  if (!fetching) {
    fetching = doFetch();
  }
}

export function getDetailedModelPricing(): DetailedModelPricing {
  return getPricingSnapshot().detailed;
}

export async function getDetailedModelPricingAsync(): Promise<DetailedModelPricing> {
  const cachedSnapshot = getCachedSnapshot();
  if (cachedSnapshot && !cachedSnapshot.stale) {
    return cachedSnapshot.detailed;
  }

  if (!fetching) {
    fetching = doFetch();
  }

  await fetching;
  return cached?.detailed ?? DEFAULT_DETAILED_PRICING;
}
