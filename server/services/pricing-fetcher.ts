import { DEFAULT_MODEL_PRICING, type ModelPricing } from '../types/index.js';
import { log } from './logger.js';

const PRICETOKEN_URL = 'https://pricetoken.ai/api/v1/text';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const FETCH_TIMEOUT_MS = 8000;

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

let cached: { pricing: ModelPricing; fetchedAt: number } | null = null;
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
    cached = { pricing, fetchedAt: Date.now() };
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

export function getModelPricing(): ModelPricing {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.pricing;
  }

  if (!fetching) {
    fetching = doFetch();
  }

  return cached?.pricing ?? DEFAULT_MODEL_PRICING;
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
