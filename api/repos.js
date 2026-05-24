const { Router } = require('express');
const { execSync } = require('child_process');

const router = Router();

let repoCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function ghExec(args) {
  return JSON.parse(
    execSync(`gh ${args}`, { encoding: 'utf-8', timeout: 30000 })
  );
}

function getRepos() {
  const now = Date.now();
  if (repoCache && now - cacheTime < CACHE_TTL) return repoCache;

  const repos = JSON.parse(
    execSync(
      'gh repo list --json name,nameWithOwner,visibility,defaultBranchRef,primaryLanguage,pushedAt,isArchived,description --limit 100',
      { encoding: 'utf-8', timeout: 30000 }
    )
  );

  repoCache = repos
    .filter(r => !r.isArchived)
    .map((r, i) => ({
      id: `r${i + 1}`,
      name: r.nameWithOwner,
      visibility: r.visibility?.toLowerCase() || 'private',
      lang: r.primaryLanguage?.name || 'Unknown',
      description: r.description || '',
      branch: r.defaultBranchRef?.name || 'main',
      source: 'github',
      pushedAt: r.pushedAt,
      risk: 0,
      findings: 0,
      secrets: 0,
      drift: 0,
      lastScan: 'never',
    }));

  cacheTime = now;
  return repoCache;
}

function getLocalProjects() {
  const { readdirSync, existsSync, statSync } = require('fs');
  const home = process.env.HOME || '/home/devuser';
  const projects = [];
  const markers = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml'];

  const scanDirs = [home];
  let idx = 100;

  for (const scanDir of scanDirs) {
    try {
      const entries = readdirSync(scanDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const projectPath = `${scanDir}/${entry.name}`;
        const hasMarker = markers.some(m => existsSync(`${projectPath}/${m}`));
        if (!hasMarker) continue;

        let lang = 'Unknown';
        if (existsSync(`${projectPath}/package.json`)) lang = 'JavaScript';
        else if (existsSync(`${projectPath}/requirements.txt`) || existsSync(`${projectPath}/pyproject.toml`)) lang = 'Python';
        else if (existsSync(`${projectPath}/go.mod`)) lang = 'Go';
        else if (existsSync(`${projectPath}/Cargo.toml`)) lang = 'Rust';

        projects.push({
          id: `l${idx++}`,
          name: projectPath.replace(home, '~'),
          visibility: 'private',
          lang,
          description: '',
          branch: '—',
          source: 'local',
          pushedAt: statSync(projectPath).mtime.toISOString(),
          risk: 0,
          findings: 0,
          secrets: 0,
          drift: 0,
          lastScan: 'never',
        });
      }
    } catch (_) {}
  }

  return projects;
}

router.get('/', (_req, res) => {
  try {
    const github = getRepos();
    const local = getLocalProjects();
    res.json({ repos: [...github, ...local], source: 'live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:owner/:repo', (req, res) => {
  try {
    const detail = ghExec(
      `repo view ${req.params.owner}/${req.params.repo} --json name,nameWithOwner,visibility,defaultBranchRef,primaryLanguage,description,pushedAt,createdAt,diskUsage,forkCount,stargazerCount,watchers,issues,pullRequests`
    );
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:owner/:repo/vulnerabilities', (req, res) => {
  try {
    const vulns = ghExec(
      `api repos/${req.params.owner}/${req.params.repo}/dependabot/alerts --jq '.'`
    );
    res.json(vulns);
  } catch (err) {
    res.json([]);
  }
});

module.exports = { reposRouter: router };
