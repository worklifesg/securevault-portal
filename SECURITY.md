# Security Policy

SecureVault is a security tool, so we take the security of the tool itself seriously.

## Threat model in brief

SecureVault is designed to run **locally**, bound to `localhost`, under a single
user's account. It is **not** hardened to be exposed to a network or run as a
multi-tenant service. Do not put it behind a public URL or reverse proxy without
adding your own authentication and transport security.

Key safety properties (please preserve them in any contribution):

- The server binds to `localhost` only.
- Detected secrets are redacted to first 4 + last 4 characters; full values are
  never persisted or logged.
- Config and scan results live under `.securevault/` (gitignored). A personal access
  token entered in Settings is stored there in plaintext on your own machine — prefer
  `gh` CLI auth if you'd rather not store a token at rest.
- SecureVault is **read-only** with respect to your repositories. It clones shallowly
  to a temp dir, scans, and deletes the clone. It never writes to or opens PRs against
  your repos.

## Supported versions

This is an actively developed project; security fixes target the latest `main`.
Please update to the latest commit before reporting.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately:

1. Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
   on this repository (Security → Report a vulnerability), **or**
2. Email the maintainer with details and reproduction steps.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a proof of concept if possible).
- Affected files, endpoints, or commit.

You can expect an acknowledgement within a few days. Once a fix is available we'll
credit you (unless you prefer to remain anonymous).
