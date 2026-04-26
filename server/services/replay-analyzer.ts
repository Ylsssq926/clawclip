import type { SessionReplay, SessionStep } from '../types/replay.js';

export interface ReplayInsight {
  type: 'good' | 'warning' | 'tip';
  stepIndex?: number;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
}

export function analyzeReplay(replay: SessionReplay): ReplayInsight[] {
  const insights: ReplayInsight[] = [];
  const steps = replay.steps;
  if (!steps.length) return insights;

  const totalCost = replay.meta.totalCost;
  const totalTokens = replay.meta.totalTokens;

  checkRetryChains(steps, insights);
  checkThinkingWaste(steps, insights);
  checkToolRetryLoop(steps, insights);
  checkModelMixing(steps, insights);
  checkLongSession(steps, insights);
  checkCostConcentration(steps, totalCost, insights);
  checkToolSuccessRate(steps, insights);
  checkTokenEfficiency(steps, totalTokens, insights);

  return insights;
}

function checkRetryChains(steps: SessionStep[], out: ReplayInsight[]) {
  // 统计有重试链路的工具调用
  const retryChains = new Map<number, { toolName: string; retryCount: number; wastedTokens: number }>();
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.retryCount !== undefined && step.retryCount > 0) {
      // 计算浪费的 tokens（所有重试的总和）
      let wastedTokens = 0;
      for (let j = i + 1; j < steps.length; j++) {
        const retryStep = steps[j];
        if (retryStep.retryOfIndex === i) {
          wastedTokens += retryStep.inputTokens + retryStep.outputTokens;
        }
      }
      
      retryChains.set(i, {
        toolName: step.toolName || 'unknown',
        retryCount: step.retryCount,
        wastedTokens,
      });
    }
  }
  
  if (retryChains.size > 0) {
    const totalChains = retryChains.size;
    const chainDetails: string[] = [];
    let totalWastedTokens = 0;
    
    for (const chain of retryChains.values()) {
      chainDetails.push(`${chain.toolName} (${chain.retryCount}次)`);
      totalWastedTokens += chain.wastedTokens;
    }
    
    out.push({
      type: 'warning',
      titleZh: `发现 ${totalChains} 个重试链路`,
      titleEn: `Found ${totalChains} retry chains`,
      descZh: `${chainDetails.slice(0, 3).join('、')}${chainDetails.length > 3 ? '等' : ''}工具失败后触发了重试，浪费了约 ${totalWastedTokens} tokens。建议检查工具配置或输入参数。`,
      descEn: `Tools ${chainDetails.slice(0, 3).join(', ')}${chainDetails.length > 3 ? ', etc.' : ''} failed and triggered retries, wasting ~${totalWastedTokens} tokens. Consider checking tool configuration or input parameters.`,
    });
  }
}

function checkThinkingWaste(steps: SessionStep[], out: ReplayInsight[]) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.type !== 'thinking') continue;
    const thinkTokens = s.inputTokens + s.outputTokens;
    const next = steps[i + 1];
    if (thinkTokens > 2000 && next && next.type === 'response' && next.content.length < 200) {
      out.push({
        type: 'warning',
        stepIndex: i,
        titleZh: '思考过多但输出过少',
        titleEn: 'Excessive thinking, minimal output',
        descZh: `第 ${i + 1} 步思考消耗了 ${thinkTokens} tokens，但下一步回复很短。可能需要优化 prompt 减少无效推理。`,
        descEn: `Step ${i + 1} used ${thinkTokens} tokens thinking, but the next response is very short. Consider optimizing the prompt to reduce wasted reasoning.`,
      });
    }
  }
}

function checkToolRetryLoop(steps: SessionStep[], out: ReplayInsight[]) {
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].type !== 'tool_call' || steps[i - 1].type !== 'tool_call') continue;
    if (steps[i].toolName && steps[i].toolName === steps[i - 1].toolName) {
      const next = steps[i + 1];
      if (next && next.type === 'tool_call' && next.toolName === steps[i].toolName) {
        out.push({
          type: 'warning',
          stepIndex: i,
          titleZh: '工具调用重试循环',
          titleEn: 'Tool call retry loop',
          descZh: `工具 "${steps[i].toolName}" 在第 ${i}-${i + 2} 步连续调用了 3+ 次，可能存在重试循环。`,
          descEn: `Tool "${steps[i].toolName}" was called 3+ times consecutively around steps ${i}-${i + 2}. This may indicate a retry loop.`,
        });
        break;
      }
    }
  }
}

function checkModelMixing(steps: SessionStep[], out: ReplayInsight[]) {
  const models = new Set<string>();
  for (const s of steps) {
    if (s.model) models.add(s.model);
  }
  if (models.size >= 3) {
    out.push({
      type: 'tip',
      titleZh: '多模型混用',
      titleEn: 'Multiple models used',
      descZh: `本会话使用了 ${models.size} 个不同模型（${[...models].slice(0, 3).join(', ')}…），频繁切换可能影响上下文连贯性。`,
      descEn: `This session used ${models.size} different models (${[...models].slice(0, 3).join(', ')}…). Frequent switching may affect context coherence.`,
    });
  }
}

function checkLongSession(steps: SessionStep[], out: ReplayInsight[]) {
  if (steps.length > 50) {
    out.push({
      type: 'tip',
      titleZh: '会话过长',
      titleEn: 'Long session',
      descZh: `本会话有 ${steps.length} 步，较长的会话会增加上下文窗口消耗。建议将复杂任务拆分为多个子会话。`,
      descEn: `This session has ${steps.length} steps. Long sessions increase context window usage. Consider splitting complex tasks into sub-sessions.`,
    });
  }
}

function checkCostConcentration(steps: SessionStep[], totalCost: number, out: ReplayInsight[]) {
  if (totalCost <= 0) return;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].cost > totalCost * 0.4 && steps[i].cost > 0.01) {
      out.push({
        type: 'warning',
        stepIndex: i,
        titleZh: '成本集中',
        titleEn: 'Cost concentration',
        descZh: `第 ${i + 1} 步花费了 $${steps[i].cost.toFixed(4)}，占会话总成本的 ${Math.round((steps[i].cost / totalCost) * 100)}%。检查该步骤是否可以优化 prompt 或换用更便宜的模型。`,
        descEn: `Step ${i + 1} cost $${steps[i].cost.toFixed(4)}, ${Math.round((steps[i].cost / totalCost) * 100)}% of session total. Consider optimizing the prompt or using a cheaper model for this step.`,
      });
      break;
    }
  }
}

function checkToolSuccessRate(steps: SessionStep[], out: ReplayInsight[]) {
  let calls = 0;
  let results = 0;
  for (const s of steps) {
    if (s.type === 'tool_call') calls++;
    if (s.type === 'tool_result') results++;
  }
  if (calls === 0) return;
  const rate = results / calls;
  if (rate >= 0.9 && calls >= 3) {
    out.push({
      type: 'good',
      titleZh: '工具使用效率高',
      titleEn: 'High tool success rate',
      descZh: `工具调用成功率 ${Math.round(rate * 100)}%（${results}/${calls}），Agent 的工具使用很稳定。`,
      descEn: `Tool call success rate: ${Math.round(rate * 100)}% (${results}/${calls}). Your Agent's tool usage is stable.`,
    });
  } else if (rate < 0.6 && calls >= 3) {
    out.push({
      type: 'warning',
      titleZh: '工具成功率偏低',
      titleEn: 'Low tool success rate',
      descZh: `工具调用成功率仅 ${Math.round(rate * 100)}%（${results}/${calls}），部分调用可能未获得预期结果。`,
      descEn: `Tool success rate is only ${Math.round(rate * 100)}% (${results}/${calls}). Some calls may not have produced expected results.`,
    });
  }
}

function checkTokenEfficiency(steps: SessionStep[], totalTokens: number, out: ReplayInsight[]) {
  if (steps.length === 0 || totalTokens === 0) return;
  const avgPerStep = totalTokens / steps.length;
  if (avgPerStep < 500 && steps.length >= 5) {
    out.push({
      type: 'good',
      titleZh: 'Token 使用高效',
      titleEn: 'Efficient token usage',
      descZh: `平均每步 ${Math.round(avgPerStep)} tokens，整体 token 效率优秀。`,
      descEn: `Average ${Math.round(avgPerStep)} tokens per step. Overall token efficiency is excellent.`,
    });
  } else if (avgPerStep > 3000 && steps.length >= 3) {
    out.push({
      type: 'tip',
      titleZh: 'Token 消耗偏高',
      titleEn: 'High token consumption',
      descZh: `平均每步 ${Math.round(avgPerStep)} tokens，可能存在上下文过长或 prompt 冗余。`,
      descEn: `Average ${Math.round(avgPerStep)} tokens per step. Context may be too long or prompts may be redundant.`,
    });
  }
}
