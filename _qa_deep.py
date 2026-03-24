"""Deep QA: verify actual data quality, not just HTTP status codes."""
import paramiko, json, sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('121.4.98.150', username='ubuntu', password='Weijiang1.', timeout=15, banner_timeout=30)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    return stdout.read().decode('utf-8', errors='replace').strip()

issues = []
passes = 0

def check(name, condition, detail=""):
    global passes
    if condition:
        passes += 1
        sys.stdout.buffer.write(f"  PASS | {name}\n".encode())
    else:
        issues.append(f"{name}: {detail}")
        sys.stdout.buffer.write(f"  FAIL | {name} | {detail}\n".encode())

# 1. Replay sessions - check data structure
raw = run('curl -s http://localhost:8080/api/replay/sessions')
sessions = json.loads(raw)
check("Replay: returns array", isinstance(sessions, list))
check("Replay: has 8 demo sessions", len(sessions) == 8, f"got {len(sessions)}")
if sessions:
    s = sessions[0]
    check("Replay: session has summary", bool(s.get('summary')), "missing summary")
    check("Replay: session has stepCount > 0", s.get('stepCount', 0) > 0, f"stepCount={s.get('stepCount')}")
    check("Replay: session has totalCost >= 0", s.get('totalCost', -1) >= 0)
    check("Replay: session has modelUsed array", isinstance(s.get('modelUsed'), list) and len(s['modelUsed']) > 0)

# 2. Replay detail - check steps content
sid = sessions[0]['id'] if sessions else ''
raw = run(f'curl -s "http://localhost:8080/api/replay/sessions/{sid}"')
replay = json.loads(raw)
check("Replay detail: has meta", 'meta' in replay)
check("Replay detail: has steps array", isinstance(replay.get('steps'), list))
steps = replay.get('steps', [])
check("Replay detail: steps > 0", len(steps) > 0, f"got {len(steps)} steps")
if steps:
    check("Replay detail: first step has type", 'type' in steps[0])
    check("Replay detail: first step has content", bool(steps[0].get('content', '')), "empty content")
    types = set(s['type'] for s in steps)
    check("Replay detail: has user step", 'user' in types, f"types={types}")
    check("Replay detail: has response step", 'response' in types, f"types={types}")

# 3. Benchmark
raw = run('curl -s http://localhost:8080/api/benchmark/latest')
bm = json.loads(raw)
check("Benchmark: has overallScore", 'overallScore' in bm)
check("Benchmark: score 0-100", 0 <= bm.get('overallScore', -1) <= 100)
check("Benchmark: has rank", bm.get('rank') in ('S','A','B','C','D'), f"rank={bm.get('rank')}")
check("Benchmark: has 6 dimensions", len(bm.get('dimensions', [])) == 6, f"got {len(bm.get('dimensions', []))}")
check("Benchmark: has summary text", len(bm.get('summary', '')) > 10)

# 4. Benchmark history
raw = run('curl -s http://localhost:8080/api/benchmark/history')
hist = json.loads(raw)
results = hist.get('results', [])
check("Benchmark history: has results", len(results) > 0, f"got {len(results)}")
if len(results) > 1:
    check("Benchmark history: sorted by time", results[0].get('runAt','') <= results[-1].get('runAt',''))

# 5. Analytics keywords
raw = run('curl -s "http://localhost:8080/api/analytics/keywords?limit=20"')
kw = json.loads(raw)
keywords = kw.get('keywords', [])
check("Analytics: has keywords", len(keywords) > 0, f"got {len(keywords)}")
if keywords:
    check("Analytics: keyword has word+count", 'word' in keywords[0] and 'count' in keywords[0])
    check("Analytics: keyword has category", keywords[0].get('category') in ('tool','topic','model','action','other'))

# 6. Analytics tags
raw = run('curl -s http://localhost:8080/api/analytics/tags')
tags = json.loads(raw)
check("Analytics tags: returns array", isinstance(tags, list))
check("Analytics tags: has entries", len(tags) > 0, f"got {len(tags)}")

# 7. Knowledge search
raw = run('curl -s "http://localhost:8080/api/knowledge/search?q=Python"')
sr = json.loads(raw)
check("Knowledge search: has results key", 'results' in sr)
check("Knowledge search: Python finds results", len(sr.get('results', [])) > 0)
if sr.get('results'):
    r = sr['results'][0]
    check("Knowledge search: result has matches", len(r.get('matches', [])) > 0)

# 8. Knowledge export
raw = run('curl -s "http://localhost:8080/api/knowledge/export/' + sid + '?format=json"')
export_json = json.loads(raw)
check("Export JSON: has meta", 'meta' in export_json)
check("Export JSON: has steps", 'steps' in export_json)

raw_md = run('curl -s "http://localhost:8080/api/knowledge/export/' + sid + '?format=markdown"')
check("Export MD: returns markdown text", raw_md.startswith('#') or '##' in raw_md, f"starts with: {raw_md[:30]}")

# 9. Leaderboard
raw = run('curl -s http://localhost:8080/api/leaderboard')
lb = json.loads(raw)
entries = lb.get('entries', [])
check("Leaderboard: has entries", len(entries) > 0, f"got {len(entries)}")
if entries:
    check("Leaderboard: entry has nickname", bool(entries[0].get('nickname')))
    check("Leaderboard: entry has score", 'score' in entries[0])
    check("Leaderboard: sorted desc by score", entries[0].get('score',0) >= entries[-1].get('score',0))

# 10. Cost
raw = run('curl -s "http://localhost:8080/api/cost/summary?days=7"')
cost = json.loads(raw)
check("Cost: has totalCost", 'totalCost' in cost)
check("Cost: has totalTokens", 'totalTokens' in cost)
check("Cost: has budget", 'budget' in cost)

# 11. Share pages
share_html = run('curl -s http://localhost:8080/share/replay/' + sid)
check("Share replay: returns HTML", '<html' in share_html.lower() or '<div' in share_html.lower() or '<!doctype' in share_html.lower(), f"got: {share_html[:50]}")

# 12. Templates
raw = run('curl -s http://localhost:8080/api/templates')
tpl = json.loads(raw)
check("Templates: returns array", isinstance(tpl, list))
check("Templates: has 5 templates", len(tpl) == 5, f"got {len(tpl)}")

ssh.close()

total = passes + len(issues)
sys.stdout.buffer.write(f"\n{'='*50}\n".encode())
sys.stdout.buffer.write(f"{passes}/{total} checks passed\n".encode())
if issues:
    sys.stdout.buffer.write(f"\nISSUES:\n".encode())
    for i in issues:
        sys.stdout.buffer.write(f"  - {i}\n".encode())
