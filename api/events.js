const { Router } = require('express');
const { execSync } = require('child_process');

const router = Router();

const eventLog = [];

function fetchGitHubActivity() {
  try {
    const raw = execSync(
      'gh api users/worklifesg/events --jq \'.[0:20] | .[] | {type: .type, repo: .repo.name, actor: .actor.login, created_at: .created_at, payload_action: .payload.action}\' 2>/dev/null || echo "[]"',
      { encoding: 'utf-8', timeout: 15000 }
    );

    if (!raw.trim() || raw.trim() === '[]') return [];

    return raw.trim().split('\n').filter(Boolean).map(line => {
      try {
        const e = JSON.parse(line);
        const ts = new Date(e.created_at);
        const time = `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}`;

        const kindMap = {
          PushEvent: 'push',
          PullRequestEvent: 'pr',
          CreateEvent: 'repo',
          DeleteEvent: 'repo',
          IssuesEvent: 'scan',
          WatchEvent: 'scan',
          ForkEvent: 'repo',
          ReleaseEvent: 'repo',
          MemberEvent: 'drift',
          PublicEvent: 'drift',
        };

        const clsMap = {
          PushEvent: 'info',
          PullRequestEvent: 'info',
          CreateEvent: 'benign',
          DeleteEvent: 'warn',
          MemberEvent: 'warn',
          PublicEvent: 'crit',
        };

        const textMap = {
          PushEvent: `Push to ${e.repo?.split('/')[1] || e.repo}`,
          PullRequestEvent: `PR ${e.payload_action || 'activity'} on ${e.repo?.split('/')[1] || e.repo}`,
          CreateEvent: `Branch/tag created on ${e.repo?.split('/')[1] || e.repo}`,
          DeleteEvent: `Branch/tag deleted on ${e.repo?.split('/')[1] || e.repo}`,
          MemberEvent: `Collaborator ${e.payload_action || 'added'} on ${e.repo?.split('/')[1] || e.repo}`,
          PublicEvent: `Repository made public: ${e.repo}`,
          ForkEvent: `Repository forked: ${e.repo}`,
          ReleaseEvent: `Release published on ${e.repo?.split('/')[1] || e.repo}`,
        };

        return {
          ts: time,
          cls: clsMap[e.type] || 'benign',
          kind: kindMap[e.type] || 'scan',
          text: textMap[e.type] || `${e.type} on ${e.repo}`,
          repo: e.repo || '—',
        };
      } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

router.get('/', (_req, res) => {
  try {
    const ghEvents = fetchGitHubActivity();
    res.json({ events: ghEvents.length > 0 ? ghEvents : eventLog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const initial = fetchGitHubActivity();
  res.write(`data: ${JSON.stringify({ type: 'initial', events: initial })}\n\n`);

  const interval = setInterval(() => {
    const events = fetchGitHubActivity();
    if (events.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'update', events: events.slice(0, 5) })}\n\n`);
    }
  }, 30000);

  req.on('close', () => clearInterval(interval));
});

router.post('/', (req, res) => {
  const event = req.body;
  event.ts = new Date().toISOString();
  eventLog.unshift(event);
  if (eventLog.length > 100) eventLog.length = 100;
  res.json({ status: 'ok' });
});

module.exports = { eventsRouter: router };
