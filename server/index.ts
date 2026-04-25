import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import statusRouter from './routes/status.js';
import costRouter from './routes/cost.js';
import skillsRouter from './routes/skills.js';
import templatesRouter from './routes/templates.js';
import replayRouter from './routes/replay.js';
import benchmarkRouter from './routes/benchmark.js';
import shareRouter from './routes/share.js';
import analyticsRouter from './routes/analytics.js';
import knowledgeRouter from './routes/knowledge.js';
import evalRouter from './routes/eval.js';
import leaderboardRouter from './routes/leaderboard.js';
import exportRouter from './routes/export.js';
import alertsRouter from './routes/alerts.js';
import otelRouter from './routes/otel.js';
import solutionsRouter from './routes/solutions.js';
import { initPricingFetcher } from './services/pricing-fetcher.js';
import { log } from './services/logger.js';

const app = express();
initPricingFetcher();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  const se = err as SyntaxError & { status?: number; body?: unknown };
  if (err instanceof SyntaxError && se.status === 400 && 'body' in se) {
    res.status(400).json({ error: '请求体不是合法 JSON / Invalid JSON body', code: 'INVALID_JSON' });
    return;
  }
  next(err);
});

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, service: 'clawclip', ts: new Date().toISOString() });
});

// API 路由
app.use('/api/status', statusRouter);
app.use('/api/cost', costRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/replay', replayRouter);
app.use('/api/benchmark', benchmarkRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/eval', evalRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/export', exportRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/otel', otelRouter);
app.use('/api/solutions', solutionsRouter);

app.use('/share', shareRouter);

// API 404：未匹配的 /api/* 请求返回 JSON 错误而非 index.html
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: '接口不存在 / Endpoint not found' });
});

// 生产环境：托管前端静态文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// tsx 直跑 server/index.ts 时 __dirname 为 server/；node server/dist/index.js 时为 server/dist/
const projectRoot =
  path.basename(__dirname) === 'dist'
    ? path.resolve(__dirname, '..', '..')
    : path.resolve(__dirname, '..');
const webDist = path.join(projectRoot, 'web', 'dist');
app.use(express.static(webDist));
app.get('*', (_req, res) => {
  const indexPath = path.join(webDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('虾片后端运行中。前端请执行 npm run dev:web 启动。');
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log.error('未捕获错误:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: '服务器内部错误 / Internal server error' });
  }
});

app.listen(PORT, () => {
  log.info(`🍤 虾片已启动 → http://localhost:${PORT}`);
});
