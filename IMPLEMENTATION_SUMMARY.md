# 免费 Tier 推荐和模型成本对比功能实现总结

## 完成的任务

### 任务1：模型成本数据库扩展 ✅

**新增文件：** `server/data/free-tiers.ts`

包含以下数据结构：

1. **FreeTierInfo 接口**：定义免费 tier 信息
   - provider, model, modelId
   - freeLimit (requestsPerDay, tokensPerDay, tokensPerMonth)
   - rateLimit (rpm, tpm)
   - requiresCreditCard, url, notes

2. **FREE_TIERS 数组**：包含 7 个免费模型
   - Groq Llama 3.1 8B / 70B
   - Google Gemini 2.5 Flash-Lite / 2.0 Flash
   - OpenRouter DeepSeek V3 / Llama 3.1 8B (free)
   - DeepSeek V3.2 (新用户 500 万 tokens)

3. **LowCostModelInfo 接口**：定义低成本模型信息
   - 包含价格、适用场景、不适用场景

4. **LOW_COST_MODELS 数组**：包含 5 个低成本模型
   - DeepSeek V3.2 ($0.14/$0.28 per M)
   - Groq Llama 3.1 8B ($0.05/$0.08 per M)
   - Groq Llama 3.1 70B ($0.59/$0.79 per M)
   - Google Gemini 2.5 Flash-Lite ($0.10/$1.50 per M)
   - Qwen Turbo ($0.033/$0.13 per M)

### 任务2：Cost Report 中新增"更便宜的替代方案" ✅

**修改文件：** `server/services/cost-parser.ts`

新增功能：

1. **suggestCheaperAlternatives() 函数**
   - 根据当前模型推荐更便宜的替代方案
   - 识别贵模型（GPT-4o, GPT-5, Claude Opus/Sonnet）
   - 推荐 DeepSeek V3.2 和 Groq Llama 70B
   - 对轻量任务额外推荐免费模型

2. **AlternativeModel 接口**
   - model, provider, inputPrice, outputPrice
   - savingsPercent（节省百分比）
   - freeTier（可选的免费 tier 信息）
   - suitableFor, notSuitableFor, notes

3. **CostParser.getCheaperAlternatives() 方法**
   - 公共 API 方法
   - 返回 AlternativesResult 包含当前价格和替代方案列表

### 任务3：API 端点暴露 ✅

**修改文件：** `server/routes/cost.ts`

新增端点：

```
GET /api/cost/alternatives?model=gpt-4o&taskType=classification
```

返回格式：
```json
{
  "currentModel": "gpt-4o",
  "currentPrice": { "input": 2.5, "output": 10.0 },
  "alternatives": [
    {
      "model": "DeepSeek V3.2",
      "provider": "DeepSeek",
      "inputPrice": 0.14,
      "outputPrice": 0.28,
      "savingsPercent": 97,
      "suitableFor": ["代码生成", "文本分析", ...],
      "notSuitableFor": ["极高精度推理", ...],
      "notes": "性价比极高，适合大部分任务"
    }
  ],
  "freeTiers": [...]
}
```

### 任务4：前端展示 ✅

**修改文件：** `web/src/pages/CostMonitor.tsx`

新增功能：

1. **类型定义**
   - FreeTierInfo, AlternativeModel, AlternativesResult

2. **状态管理**
   - `alternatives` state 存储替代方案数据

3. **数据获取**
   - 在 loadData() 中自动检测贵模型
   - 异步获取前 3 个贵模型的替代方案

4. **UI 展示**
   - 在模型成本分析区域下方
   - 使用 `<details>` 折叠组件
   - 显示每个替代方案的：
     - 模型名称和提供商
     - 免费徽章（如有）
     - 节省百分比徽章
     - 价格对比（输入/输出）
     - 说明和免费额度
   - 底部显示免责声明（中英文）

## 技术细节

### 推荐逻辑

1. **贵模型识别**：
   - GPT-4o, GPT-5 系列
   - Claude Opus, Claude Sonnet 系列

2. **推荐策略**：
   - 贵模型 → DeepSeek V3.2 + Groq Llama 70B
   - 轻量任务 → 额外推荐 Groq Llama 8B（免费）

3. **节省计算**：
   - 基于输出价格计算节省百分比
   - 按节省百分比排序

### 前端交互

1. **自动触发**：检测到贵模型时自动获取替代方案
2. **折叠展示**：默认折叠，点击展开
3. **多语言支持**：中英文界面
4. **免责声明**：提醒用户先测试再使用

## 测试验证

### 后端检查
```bash
npm run check --workspace=server
```
✅ 通过 TypeScript 类型检查

### 前端检查
```bash
npm run check --workspace=web
```
✅ 通过 TypeScript 类型检查

### 数据验证
- ✅ 7 个免费 tier 数据
- ✅ 5 个低成本模型数据
- ✅ API 端点正常工作

## 使用示例

### API 调用
```bash
curl "http://localhost:3000/api/cost/alternatives?model=gpt-4o"
```

### 前端效果
1. 用户访问 Cost Monitor 页面
2. 如果使用了 GPT-4o 等贵模型
3. 在模型成本分析下方显示折叠的"更便宜的替代方案"
4. 点击展开查看 2-3 个推荐方案
5. 每个方案显示节省百分比、价格对比、免费额度等

## 注意事项

1. **免责声明**：替代方案基于价格推荐，实际效果需测试
2. **数据更新**：价格数据基于 2026-03-25，需定期更新
3. **性能优化**：只获取前 3 个贵模型的替代方案，避免过多 API 调用
4. **错误处理**：API 调用失败时静默忽略，不影响主功能

## 未来改进

1. 添加用户反馈机制（替代方案是否有效）
2. 基于实际使用数据优化推荐算法
3. 支持自定义推荐规则
4. 添加 A/B 测试功能
5. 集成 Ollama 本地模型检测
