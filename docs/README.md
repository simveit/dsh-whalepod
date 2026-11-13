# Whalepod documentation

These documents describe the plugin as the code stands.

| Document | What it covers |
|---|---|
| [design.md](design.md) | Goal, the user-facing model (coordinators and their names, Executor Sessions, the Coordinator page, the pane, the sidebar), decided behaviour including the Executor prompt, and what is out of scope. |
| [architecture.md](architecture.md) | How it is built: host services, coordinator records, names and Executor prompts, adoption, fencing and folders, the Executor Session lifecycle and status, notices, scoped tools, presets, models, persistence and the version 2 state file, the Remote contract, the client, configuration. |
| [security.md](security.md) | Threat model, trust boundaries, what dsh and the host enforce versus what rests on prompts, and known limits. |
| [decisions.md](decisions.md) | Decision log: context, decision, reason, and rejected alternatives for each choice. |
| [superagent-prototype.md](superagent-prototype.md) | How the plugin relates to the dsh-superagent prototype: what was reused, what was left out, the terms adopted from its draft, and where the two differ. |
| [plugin-page.md](plugin-page.md), [plugin-page.zh-CN.md](plugin-page.zh-CN.md) | The short text dsh's Plugins page shows above the settings, in place of the README (`meta.detail` in `locale/en.json` and `locale/zh.json`). Shipped in the package. |
| [dsh-api-notes.md](dsh-api-notes.md) | The dsh APIs the plugin relies on, as verified on dsh 0.2.2-rc.2, with gotchas, a re-check list for new dsh versions, and which round 2 runtime facts are verified and which are still open. |
