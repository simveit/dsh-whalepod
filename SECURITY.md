# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue.

Use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Include the plugin version, the DeepSeek Harness version (`dsh --version`), the profile (`desktop`, `web` or another), and the steps that show the problem. A proof of concept that uses the mock model in `dev/mock-llm.mjs` is welcome but not required.

If the **Report a vulnerability** button is not available, open a public issue titled "Security: private contact requested" that only asks for a private way to send a report. Put no details of the problem in the issue. The maintainer will answer there with a private channel.

There is no fixed response time. Fixes are released as a new version and noted in [CHANGELOG.md](CHANGELOG.md).

## Supported versions

Only the latest release gets security fixes.

## What counts as a vulnerability

[docs/security.md](docs/security.md) describes what the plugin protects, which boundaries the host code enforces and which rest on a prompt, and the known limits. A report is most useful when it breaks a boundary that the page says the host enforces, for example:

- an Orchestrator reading the plugin's own state folder (`storages/dsh-coordinator` in the dsh home), or an Executor Session or a Teammate reading or writing it with a file or search tool (a shell command that gets there is a known limit, not a finding);
- an Executor Session starting in a folder that needs the user's confirmation without it;
- text from an executor or a web page being accepted as the user's instruction;
- one Orchestrator reaching another Orchestrator's Executor Sessions;
- an Orchestrator using a tool outside its allow list.

The limits listed under "Known limits" in docs/security.md are known. A new way to exploit one of them is still worth reporting.

Problems in DeepSeek Harness itself, such as its sandbox or Auto review, belong to the DeepSeek Harness project. Tell us too if the plugin makes them worse.
