# Security Policy

ClawClip is a local-first Agent diagnostic console. If you believe you have found a security issue, please report it privately so we can review it before details become public.

## Supported Versions

Security fixes are currently planned for the latest stable `1.1.x` line only.

| Version | Supported |
| --- | --- |
| `1.1.x` | Yes |
| `1.0.x` and earlier | No — please upgrade before requesting a fix |
| Unreleased branches / local forks | Best effort only |

## How to Report a Vulnerability

**Please do not open a public issue with exploit details.**

Preferred path:
1. Use GitHub's private vulnerability reporting flow from the repository Security tab: <https://github.com/Ylsssq926/clawclip/security>
2. If that private flow is not available to you, contact the maintainer privately through GitHub and clearly mark the message with `[SECURITY] ClawClip`.

Please include:
- ClawClip version
- How you run it (`npm start`, dev, Docker, PM2, etc.)
- Operating system
- Whether custom paths or environment variables are involved
- A minimal reproduction and expected impact
- Any logs or screenshots with secrets, tokens, and private session data removed

## What to Expect

- We will review reports as maintainer time allows.
- We may ask you to confirm the issue on the latest `1.1.x` release before triage.
- If we can reproduce the issue, we will decide on a fix, mitigation, or documentation update based on severity and scope.
- Fix timing depends on impact, complexity, and maintainer availability.
- When a fix is ready, we may publish it in a patch release and credit the reporter if they want to be named.

## Disclosure Guidance

Until we have reviewed the report:
- do **not** post a working exploit publicly;
- do **not** attach private session transcripts, API keys, access tokens, or other secrets;
- do share a minimal redacted reproduction privately so we can verify the issue.

Thank you for helping keep ClawClip safer for everyone.
