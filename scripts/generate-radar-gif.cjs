#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const lang = process.argv[2] || 'zh';

const I18N = {
  zh: {
    title: 'ClawClip',
    subtitle: 'AI Agent 性能报告',
    phaseBefore: 'Before - Current Status',
    phaseBeforeDesc: 'Agent 性能有待提升',
    phaseTransition: 'Optimizing in Progress...',
    phaseAfter: 'After Optimization - Target Reached!',
    phaseAfterDesc: 'Agent 已达到最佳表现',
    overallLabel: '综合评分',
    panelTitle: '优化详情',
    scoreFrom: '优化前',
    scoreTo: '优化后',
  },
  en: {
    title: 'ClawClip',
    subtitle: 'AI Agent Performance Report',
    phaseBefore: 'Before - Current Status',
    phaseBeforeDesc: 'Agent performance needs improvement',
    phaseTransition: 'Optimizing in Progress...',
    phaseAfter: 'After Optimization - Target Reached!',
    phaseAfterDesc: 'Agent is now performing at peak level',
    overallLabel: 'Overall Score',
    panelTitle: 'Optimization Details',
    scoreFrom: 'Before',
    scoreTo: 'After',
  }
};

const t = I18N[lang];

console.log(`ClawClip Radar GIF Generator (${lang === 'zh' ? '中文版' : 'English'})\n`);

const { createCanvas } = require('canvas');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const W = 960;
const H = 680;
const CX = W / 2 - 100;
const CY = H / 2;
const R = 180;

const DIMENSIONS = ['Writing', 'Coding', 'Tools', 'Search', 'Safety', 'Cost'];
const DIM_COLORS = ['#f472b6', '#60a5fa', '#fb923c', '#22d3ee', '#4ade80', '#facc15'];

const IMPROVEMENTS = {
  zh: [
    { dim: 'Writing', from: 42, to: 82, tip: '结构化 Prompt + 少样本学习' },
    { dim: 'Coding', from: 28, to: 88, tip: 'Claude Opus 4.6 复杂任务专项' },
    { dim: 'Tools', from: 35, to: 80, tip: 'MCP 协议 + 智能重试机制' },
    { dim: 'Search', from: 48, to: 85, tip: '混合检索 + Rerank 重排序' },
    { dim: 'Safety', from: 55, to: 92, tip: '双层内容安全过滤引擎' },
    { dim: 'Cost', from: 22, to: 75, tip: '简单任务路由至 Gemini 3.1 Flash' },
  ],
  en: [
    { dim: 'Writing', from: 42, to: 82, tip: 'Structured Prompt + Few-shot Learning' },
    { dim: 'Coding', from: 28, to: 88, tip: 'Claude Opus 4.6 for Complex Tasks' },
    { dim: 'Tools', from: 35, to: 80, tip: 'MCP Protocol + Smart Retry' },
    { dim: 'Search', from: 48, to: 85, tip: 'Hybrid Search + Rerank' },
    { dim: 'Safety', from: 55, to: 92, tip: 'Dual-layer Safety Filter' },
    { dim: 'Cost', from: 22, to: 75, tip: 'Simple Tasks → Gemini 3.1 Flash' },
  ]
};

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function polarToCartesian(angle, radius) {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad)
  };
}

function getScoreColor(score) {
  if (score < 50) return '#ef4444';
  if (score < 70) return '#f59e0b';
  return '#22c55e';
}

function drawRadarFrame(ctx, scores, overallScore) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  const scoreColor = getScoreColor(overallScore);

  for (let level = 1; level <= 5; level++) {
    const levelR = R * level / 5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const { x, y } = polarToCartesian(i * 60, levelR);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = level === 5 ? scoreColor : '#e2e8f0';
    ctx.lineWidth = level === 5 ? 2.5 : 1;
    ctx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const { x, y } = polarToCartesian(i * 60, R);
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const animatedPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = i * 60;
    const targetR = R * (scores[i] / 100);
    const { x, y } = polarToCartesian(angle, targetR);
    animatedPoints.push({ x, y });
  }

  const gradient = ctx.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
  const fillColor = overallScore < 50 ? '220, 38, 38' : overallScore < 70 ? '245, 158, 11' : '34, 197, 94';
  gradient.addColorStop(0, `rgba(${fillColor}, 0.35)`);
  gradient.addColorStop(1, `rgba(${fillColor}, 0.15)`);

  ctx.beginPath();
  animatedPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  animatedPoints.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = DIM_COLORS[i];
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  DIMENSIONS.forEach((dim, i) => {
    const { x, y } = polarToCartesian(i * 60, R + 28);
    ctx.fillText(dim, x, y + 5);
  });
}

function drawScorePanel(ctx, currentScores) {
  const panelX = W - 240;
  const panelW = 220;
  const panelY = 60;
  const panelH = 560;

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'center';
  ctx.fillText(t.panelTitle, panelX + panelW / 2, panelY + 30);

  const improvements = IMPROVEMENTS[lang];
  improvements.forEach((item, i) => {
    const y = panelY + 60 + i * 82;
    const currentScore = currentScores[i];
    const barWidth = (currentScore / 100) * 172;
    const fromWidth = (item.from / 100) * 172;

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = DIM_COLORS[i];
    ctx.textAlign = 'left';
    ctx.fillText(item.dim, panelX + 12, y);

    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    const tipText = item.tip.length > 26 ? item.tip.substring(0, 24) + '...' : item.tip;
    ctx.fillText(tipText, panelX + 12, y + 12);

    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(panelX + 12, y + 20, 172, 10, 5);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(panelX + 12, y + 20, fromWidth, 10, 5);
    ctx.fill();

    if (currentScore > item.from) {
      ctx.fillStyle = getScoreColor(currentScore);
      ctx.beginPath();
      ctx.roundRect(panelX + 12 + fromWidth, y + 20, barWidth - fromWidth, 10, 5);
      ctx.fill();
    }

    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(item.from.toString(), panelX + 12, y + 45);

    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'right';
    ctx.fillText(currentScore.toString(), panelX + 172, y + 45);

    if (currentScore > item.from) {
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'left';
      ctx.fillText('+' + (currentScore - item.from), panelX + 188, y + 45);
    }
  });
}

function drawHeader(ctx, phase, overallScore, scoreColor) {
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.fillText(t.title, 30, 45);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(t.subtitle, 30, 68);

  if (phase === 'before') {
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText(t.phaseBefore, CX + 50, 40);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(t.phaseBeforeDesc, CX + 50, 60);
  } else if (phase === 'after') {
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText(t.phaseAfter, CX + 50, 40);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(t.phaseAfterDesc, CX + 50, 60);
  }

  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillStyle = scoreColor;
  ctx.textAlign = 'center';
  ctx.fillText(overallScore.toString(), CX + 50, CY + 20);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(t.overallLabel, CX + 50, CY + 45);
}

function writeFrame(gif, ctx, delay) {
  const imageData = ctx.getImageData(0, 0, W, H);
  const palette = quantize(imageData.data, 256);
  const indexed = applyPalette(imageData.data, palette);
  gif.writeFrame(indexed, W, H, { palette, delay, repeat: 0 });
}

console.log('Generating radar animation...\n');

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const root = path.resolve(__dirname, '..');
const gifPath = path.join(root, 'docs', `radar-animation-${lang}.gif`);

const gif = new GIFEncoder(W, H);

const BEFORE_FRAMES = 55;
const TRANSITION_FRAMES = 55;
const AFTER_FRAMES = 35;
const HOLD_FRAMES = 25;

const improvements = IMPROVEMENTS[lang];
const startScores = improvements.map(i => i.from);
const endScores = improvements.map(i => i.to);
const startOverall = Math.round(startScores.reduce((a, b) => a + b, 0) / startScores.length);
const endOverall = Math.round(endScores.reduce((a, b) => a + b, 0) / endScores.length);

for (let frame = 0; frame < BEFORE_FRAMES; frame++) {
  drawRadarFrame(ctx, startScores, startOverall);
  drawScorePanel(ctx, startScores);
  drawHeader(ctx, 'before', startOverall, getScoreColor(startOverall));
  writeFrame(gif, ctx, 55);
  process.stdout.write(`\r   Before: ${Math.round((frame / BEFORE_FRAMES) * 100)}%`);
}

for (let frame = 0; frame < TRANSITION_FRAMES; frame++) {
  const progress = easeOutQuart(frame / TRANSITION_FRAMES);
  const scores = startScores.map((s, i) => Math.round(s + (endScores[i] - s) * progress));
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  drawRadarFrame(ctx, scores, overall);
  drawScorePanel(ctx, scores);
  drawHeader(ctx, 'transition', overall, getScoreColor(overall));

  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'center';
  ctx.fillText(t.phaseTransition, CX + 50, 40);

  writeFrame(gif, ctx, 55);
  process.stdout.write(`\r   Transition: ${Math.round((frame / TRANSITION_FRAMES) * 100)}%`);
}

for (let frame = 0; frame < AFTER_FRAMES; frame++) {
  drawRadarFrame(ctx, endScores, endOverall);
  drawScorePanel(ctx, endScores);
  drawHeader(ctx, 'after', endOverall, getScoreColor(endOverall));
  writeFrame(gif, ctx, 55);
  process.stdout.write(`\r   After: ${Math.round((frame / AFTER_FRAMES) * 100)}%`);
}

for (let frame = 0; frame < HOLD_FRAMES; frame++) {
  drawRadarFrame(ctx, endScores, endOverall);
  drawScorePanel(ctx, endScores);
  drawHeader(ctx, 'after', endOverall, getScoreColor(endOverall));
  writeFrame(gif, ctx, 120);
  process.stdout.write(`\r   Hold: ${Math.round((frame / HOLD_FRAMES) * 100)}%`);
}

gif.finish();

const buffer = gif.bytesView();
fs.writeFileSync(gifPath, Buffer.from(buffer));

const totalFrames = BEFORE_FRAMES + TRANSITION_FRAMES + AFTER_FRAMES + HOLD_FRAMES;
console.log('\n\nDone!');
console.log('Output: ' + gifPath);
console.log('Size: ' + W + 'x' + H);
console.log('Total Frames: ' + totalFrames);
const sizeKB = (fs.statSync(gifPath).size / 1024).toFixed(1);
console.log('File size: ' + sizeKB + ' KB\n');
