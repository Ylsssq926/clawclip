#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');

const serverDist = path.join(root, 'server', 'dist', 'index.js');
const webDist = path.join(root, 'web', 'dist', 'index.html');

if (!fs.existsSync(serverDist) || !fs.existsSync(webDist)) {
  console.log('🍤 首次启动，正在构建（约 1-2 分钟）...');
  console.log('   First run — building (may take 1-2 min)...\n');
  try {
    execSync('npm run build', { cwd: root, stdio: 'inherit' });
  } catch {
    console.error('\n❌ 构建失败，请检查日志。Build failed.\n');
    process.exit(1);
  }
  console.log('\n✅ 构建完成。Build complete.\n');
}

const PORT = process.env.PORT || '8080';
console.log(`🍤 虾片 (ClawClip) 启动中...`);
console.log(`   http://localhost:${PORT}\n`);

const child = spawn('node', [serverDist], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PORT },
});

child.on('exit', (code) => process.exit(code ?? 0));
