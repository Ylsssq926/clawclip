import {
  DEFAULT_MODEL_PRICING,
  DEFAULT_DETAILED_PRICING,
  type ModelPricing,
  type DetailedModelPricing,
  type PricingSource,
} from '../types/index.js';
import { log } from './logger.js';

const PRICETOKEN_URL = 'https://pricetoken.ai/api/v1/text';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 8000;
const STATIC_DEFAULT_PRICING_UPDATED_AT = '2026-03-25T00:00:00.000Z';

export interface PricingSnapshot {
  pricing: ModelPricing;
  detailed: DetailedModelPricing;
  source: PricingSource;
  updatedAt: string;
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

let cached: { pricing: ModelPricing; detailed: DetailedModelPricing; fetchedAt: number } | null = null;
let fetching: Promise<ModelPricing> | null = null;

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

async function doFetch(): Promise<ModelPricing> {
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
    return pricing;
  } catch (err) {
    log.warn('[pricing-fetcher] failed, using static fallback:', (err as Error).message);
    return DEFAULT_MODEL_PRICING;
  } finally {
    clearTimeout(timer);
    fetching = null;
  }
}

export function getPricingSnapshot(): PricingSnapshot {
  if (cached) {
    if (Date.now() - cached.fetchedAt >= CACHE_TTL_MS && !fetching) {
      fetching = doFetch();
    }

    return {
      pricing: cached.pricing,
      detailed: cached.detailed,
      source: 'pricetoken',
      updatedAt: new Date(cached.fetchedAt).toISOString(),
    };
  }

  if (!fetching) {
    fetching = doFetch();
  }

  return {
    pricing: DEFAULT_MODEL_PRICING,
    detailed: DEFAULT_DETAILED_PRICING,
    source: 'static-default',
    updatedAt: STATIC_DEFAULT_PRICING_UPDATED_AT,
  };
}

export function getModelPricing(): ModelPricing {
  return getPricingSnapshot().pricing;
}

export async function getModelPricingAsync(): Promise<ModelPricing> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.pricing;
  }

  if (!fetching) {
    fetching = doFetch();
  }

  return fetching;
}

export function initPricingFetcher(): void {
  doFetch().catch(() => {});
}

export function getDetailedModelPricing(): DetailedModelPricing {
  return getPricingSnapshot().detailed;
}

export async function getDetailedModelPricingAsync(): Promise<DetailedModelPricing> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.detailed;
  }

  if (!fetching) {
    fetching = doFetch();
  }

  await fetching;
  return cached?.detailed ?? DEFAULT_DETAILED_PRICING;
}
