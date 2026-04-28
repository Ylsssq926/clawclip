# 配置文件自动更新设计方案

## 方案概述

使用 chokidar 监听配置文件变化 + SSE (Server-Sent Events) 推送更新通知到前端，实现配置文件修改后自动刷新页面。

### 核心技术栈
- **chokidar**: 跨平台文件监听库，支持 Windows/macOS/Linux
- **SSE (Server-Sent Events)**: 单向服务器推送，比 WebSocket 更轻量
- **EventSource API**: 浏览器原生 SSE 客户端

## 技术细节

### 1. 后端文件监听 (chokidar)

```typescript
// server/services/config-watcher.ts
import chokidar from 'chokidar';
import { EventEmitter } from 'events';

export class ConfigWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;

  start(configPaths: string[]) {
    this.watcher = chokidar.watch(configPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,  // 等待 300ms 确保写入完成
        pollInterval: 100
      },
      // Windows 特定优化
      usePolling: process.platform === 'win32',
      interval: 1000,
    });

    this.watcher
      .on('change', (path) => {
        this.emit('config-changed', { path, timestamp: Date.now() });
      })
      .on('error', (error) => {
        console.error('Config watcher error:', error);
      });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
```

### 2. SSE 端点实现

```typescript
// server/routes/sse.ts
import { Router } from 'express';
import { configWatcher } from '../services/config-watcher';

const router = Router();

router.get('/api/sse/config-updates', (req, res) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  // 发送初始连接确认
  res.write('data: {"type":"connected"}\n\n');

  // 监听配置变化
  const onConfigChange = (data: { path: string; timestamp: number }) => {
    res.write(`data: ${JSON.stringify({ type: 'config-changed', ...data })}\n\n`);
  };

  configWatcher.on('config-changed', onConfigChange);

  // 客户端断开时清理
  req.on('close', () => {
    configWatcher.off('config-changed', onConfigChange);
    res.end();
  });

  // 心跳保活 (每 30 秒)
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

export default router;
```

### 3. 前端 EventSource 客户端

```typescript
// web/src/hooks/useConfigWatcher.ts
import { useEffect, useRef } from 'react';

export function useConfigWatcher(onConfigChange: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/sse/config-updates');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[ConfigWatcher] SSE connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'config-changed') {
          console.log('[ConfigWatcher] Config changed:', data.path);
          onConfigChange();
        }
      } catch (error) {
        console.error('[ConfigWatcher] Parse error:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[ConfigWatcher] SSE error:', error);
      // 浏览器会自动重连，无需手动处理
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [onConfigChange]);
}
```

### 4. 页面集成示例

```typescript
// web/src/pages/Dashboard.tsx
import { useConfigWatcher } from '../hooks/useConfigWatcher';

export default function Dashboard() {
  const [showReloadBanner, setShowReloadBanner] = useState(false);

  useConfigWatcher(() => {
    setShowReloadBanner(true);
  });

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div>
      {showReloadBanner && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <p>配置已更新</p>
          <button onClick={handleReload}>刷新页面</button>
        </div>
      )}
      {/* 页面内容 */}
    </div>
  );
}
```

## 风险点和缓解措施

### 1. Windows EMFILE 错误
**风险**: Windows 文件句柄限制可能导致 `EMFILE: too many open files` 错误。

**缓解**:
- 使用 `usePolling: true` 在 Windows 上启用轮询模式
- 限制监听的文件数量，只监听关键配置文件
- 设置合理的 `interval` (1000ms) 避免频繁轮询

### 2. 文件写入中途触发
**风险**: 编辑器保存时可能触发多次 `change` 事件，导致读取不完整文件。

**缓解**:
- 使用 `awaitWriteFinish` 配置等待文件写入稳定
- `stabilityThreshold: 300ms` 确保文件写入完成后再触发事件
- 后端读取配置前添加 try-catch 处理解析错误

### 3. SSE 连接泄漏
**风险**: 页面切换或刷新时 SSE 连接未正确关闭，导致服务器资源泄漏。

**缓解**:
- 使用 React `useEffect` cleanup 函数确保组件卸载时关闭连接
- 服务器端监听 `req.on('close')` 清理事件监听器
- 添加心跳机制检测僵尸连接

### 4. 浏览器兼容性
**风险**: 旧版浏览器可能不支持 EventSource API。

**缓解**:
- 添加 polyfill: `npm install event-source-polyfill`
- 或降级到轮询方案 (每 5 秒请求一次 `/api/config/version`)

### 5. 开发环境 HMR 冲突
**风险**: Vite HMR 和配置监听同时触发可能导致重复刷新。

**缓解**:
- 开发环境禁用配置监听: `if (import.meta.env.PROD) { useConfigWatcher(...) }`
- 或添加防抖逻辑，5 秒内只触发一次刷新

## 实现步骤

### 阶段 1: 后端基础设施 (1-2 小时)
1. 安装依赖: `npm install chokidar --workspace=server`
2. 创建 `server/services/config-watcher.ts`
3. 在 `server/index.ts` 中初始化 watcher
4. 添加 SSE 路由 `server/routes/sse.ts`

### 阶段 2: 前端 Hook (1 小时)
1. 创建 `web/src/hooks/useConfigWatcher.ts`
2. 添加 TypeScript 类型定义
3. 编写单元测试 (可选)

### 阶段 3: UI 集成 (1 小时)
1. 在 Dashboard 页面集成 `useConfigWatcher`
2. 设计刷新提示 Banner UI
3. 添加用户手动刷新按钮

### 阶段 4: 测试和优化 (1-2 小时)
1. 测试 Windows 环境文件监听
2. 测试 SSE 连接断开重连
3. 测试多标签页同时连接
4. 性能测试: 监听 10+ 配置文件
5. 添加日志和错误监控

## 预计工作量

- **开发时间**: 4-6 小时
- **测试时间**: 2 小时
- **文档编写**: 1 小时
- **总计**: 7-9 小时

## 替代方案

### 方案 A: 轮询 (Polling)
**优点**: 实现简单，兼容性好  
**缺点**: 延迟高 (5-10 秒)，服务器负载高

### 方案 B: WebSocket
**优点**: 双向通信，实时性好  
**缺点**: 过度设计 (单向推送用 SSE 足够)，需要额外的心跳和重连逻辑

### 方案 C: 不实现自动刷新
**优点**: 零开发成本  
**缺点**: 用户体验差，需要手动刷新页面

## 参考资料

- [chokidar 文档](https://github.com/paulmillr/chokidar)
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
