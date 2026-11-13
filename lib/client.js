window.__ModuleLoader__.load({
	id: "dsh-whalepod",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let zod = require("zod");
		// src/client/icons.tsx
		function glyph(paths, defaultSize = 16) {
			return function Icon({ size = defaultSize, className }) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
					width: size,
					height: size,
					viewBox: "0 0 16 16",
					fill: "none",
					strokeWidth: 1,
					className,
					"aria-hidden": "true",
					focusable: "false",
					children: paths
				});
			};
		}
		/** `agent-preset-outline`: three agents around one plan; dsh uses it for team-driven turns. */
		const IconCoordinator = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "currentColor",
				d: "M6.51867 12.3282C7.29816 12.6011 8.16475 12.6514 9.02269 12.4216C9.57879 12.2726 10.0784 12.0185 10.5087 11.6888C10.7819 12.0555 11.1606 12.3304 11.5913 12.4805C10.9688 13.029 10.2149 13.4478 9.35911 13.6771C8.13946 14.0038 6.90632 13.8971 5.82126 13.4533C6.15821 13.1562 6.4021 12.7652 6.51867 12.3282ZM9.17629 2.89409C11.1101 3.34433 12.739 4.81872 13.2889 6.87043C13.4219 7.3665 13.4811 7.8649 13.4774 8.35466C13.0924 8.13213 12.6422 8.01837 12.1741 8.05276L12.1711 8.05257C12.1539 7.77199 12.109 7.48889 12.0334 7.20684C11.6363 5.72533 10.5048 4.6372 9.13549 4.22844C9.25559 3.87667 9.29214 3.49087 9.22309 3.09892C9.2108 3.02922 9.19451 2.96108 9.17629 2.89409ZM4.7311 3.89107L4.78302 4.11879C4.87648 4.4488 5.04146 4.74263 5.25579 4.98896C3.98078 6.01355 3.35848 7.72904 3.8089 9.41059C3.81828 9.44559 3.82866 9.48025 3.83885 9.51479C3.38217 9.61268 2.98548 9.84137 2.68107 10.1556C2.63414 10.022 2.5897 9.88632 2.55244 9.74726C1.93301 7.43489 2.86717 5.07173 4.71504 3.76697L4.7311 3.89107Z"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M7.99136 5.28105C8.87501 5.28105 9.59136 4.56471 9.59136 3.68105C9.59136 2.7974 8.87501 2.08105 7.99136 2.08105C7.1077 2.08105 6.39136 2.7974 6.39136 3.68105C6.39136 4.56471 7.1077 5.28105 7.99136 5.28105Z"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M3.94009 12.9417C4.82374 12.9417 5.54009 12.2254 5.54009 11.3417C5.54009 10.458 4.82374 9.7417 3.94009 9.7417C3.05643 9.7417 2.34009 10.458 2.34009 11.3417C2.34009 12.2254 3.05643 12.9417 3.94009 12.9417Z"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M12.0851 12.9417C12.9688 12.9417 13.6851 12.2254 13.6851 11.3417C13.6851 10.458 12.9688 9.7417 12.0851 9.7417C11.2015 9.7417 10.4851 10.458 10.4851 11.3417C10.4851 12.2254 11.2015 12.9417 12.0851 12.9417Z"
			})
		] }));
		/** `archive-outline`. */
		const IconArchive = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M13.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V4.5C1.5 5.05228 1.94772 5.5 2.5 5.5H13.5C14.0523 5.5 14.5 5.05228 14.5 4.5V3.5C14.5 2.94772 14.0523 2.5 13.5 2.5Z"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M2.5 5.5V13.5C2.5 13.7652 2.60536 14.0196 2.79289 14.2071C2.98043 14.3946 3.23478 14.5 3.5 14.5H12.5C12.7652 14.5 13.0196 14.3946 13.2071 14.2071C13.3946 14.0196 13.5 13.7652 13.5 13.5V5.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M6.5 9.5H9.5"
			})
		] }));
		/** `new-chat-outline`. */
		const IconChat = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M2.37091 11.2501C1.58745 9.89288 1.32067 8.29835 1.61969 6.76006C1.91872 5.22177 2.76342 3.8433 3.99826 2.87846C5.2331 1.91362 6.77494 1.42737 8.33988 1.50925C9.90482 1.59113 11.3875 2.23562 12.5149 3.32406C13.6425 4.41269 14.3387 5.87206 14.4754 7.4334C14.612 8.99474 14.18 10.5529 13.2587 11.8209C12.3375 13.0888 10.9891 13.9813 9.46194 14.3337C8.18691 14.628 6.85895 14.5294 5.64989 14.0605C5.1712 13.8748 4.76962 13.4932 4.26534 13.3967C3.67413 13.2835 2.95257 13.5598 2.03794 14.3337"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M8 5V11"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				d: "M5 8H11"
			})
		] }));
		/** `warning-triangle-outline`. */
		const IconWarning = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			d: "M6.87 2.6a1.33 1.33 0 0 1 2.26 0l5.34 9.33A1.33 1.33 0 0 1 13.33 14H2.67a1.33 1.33 0 0 1-1.14-2.07Z"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			d: "M8 6v3m0 2.33h.01"
		})] }));
		/** Chevron pointing down (rotated by CSS when collapsed); drawn in the same 1px stroke. */
		const IconChevron = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			d: "M4 6L8 10L12 6"
		}));
		/** Rows in a frame: opens the full Coordinator page. Drawn in the same 1px stroke. */
		const IconOverview = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: "1.5",
			y: "2.5",
			width: "13",
			height: "11",
			rx: "2",
			stroke: "currentColor"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinecap: "round",
			d: "M4.5 6H11.5M4.5 8.5H11.5M4.5 11H8.5"
		})] }));
		/** `shield-outline`: the permission mode glyph, as dsh's permission picker shows it. */
		const IconShield = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinejoin: "round",
			d: "M8 1.75L13 3.6V7.4C13 10.35 10.95 12.95 8 14.25C5.05 12.95 3 10.35 3 7.4V3.6L8 1.75Z"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			d: "M5.9 8.1L7.35 9.55L10.2 6.7"
		})] }));
		/** `folder-open-outline`: a coordinator's folder (where its new Executor Sessions start). */
		const IconFolder = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			d: "M12.3994 13.5986H2.04956C1.49728 13.5986 1.04956 13.1509 1.04956 12.5986V3.40137C1.04956 2.84908 1.49728 2.40137 2.04956 2.40137H4.76632C5.01016 2.40137 5.24561 2.49046 5.42836 2.6519L6.94088 3.98799C7.12364 4.14943 7.35908 4.23852 7.60293 4.23852H12.3994C12.9517 4.23852 13.3994 4.68624 13.3994 5.23852V7.16991"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			d: "M2.55911 7.93683C2.67584 7.49906 3.07229 7.19446 3.52536 7.19446H13.6491C14.3061 7.19446 14.7846 7.81725 14.6153 8.45209L13.4411 12.856C13.3244 13.2938 12.9279 13.5984 12.4748 13.5984H2.35113C1.69411 13.5984 1.21562 12.9756 1.38489 12.3407L2.55911 7.93683Z"
		})] }));
		/** `edit-outline`: a pencil, for renaming. Drawn in the same 1px stroke. */
		const IconPencil = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinejoin: "round",
			d: "M10.6 2.9L13.1 5.4L5.6 12.9L2.5 13.5L3.1 10.4L10.6 2.9Z"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			d: "M9.2 4.3L11.7 6.8"
		})] }));
		/** A check mark, for saved feedback. Drawn in the same 1px stroke. */
		const IconCheck = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinecap: "round",
			strokeLinejoin: "round",
			d: "M3.5 8.5L6.5 11.5L12.5 4.5"
		}));
		/** A text cursor in a field: type a path instead of picking a folder. Drawn in the same 1px stroke. */
		const IconTextField = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: "1.5",
			y: "4.5",
			width: "13",
			height: "7",
			rx: "2",
			stroke: "currentColor"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			stroke: "currentColor",
			strokeLinecap: "round",
			d: "M5 6.5V9.5M4 6.5H6M4 9.5H6"
		})] }));
		/** A page with lines: standing instructions (the executor prompt). Drawn in the same 1px stroke. */
		const IconInstructions = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				strokeLinejoin: "round",
				d: "M3.5 2.5C3.5 1.95 3.95 1.5 4.5 1.5H9.3L12.5 4.7V13.5C12.5 14.05 12.05 14.5 11.5 14.5H4.5C3.95 14.5 3.5 14.05 3.5 13.5V2.5Z"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				strokeLinejoin: "round",
				d: "M9.3 1.5V4.7H12.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				strokeLinecap: "round",
				d: "M5.75 7.5H10.25M5.75 9.75H10.25M5.75 12H8.5"
			})
		] }));
		/** `delete-outline`: a bin, for deleting an archived coordinator's entry. Drawn in the same 1px stroke. */
		const IconTrash = glyph(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				strokeLinecap: "round",
				d: "M2.5 4H13.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				strokeLinejoin: "round",
				d: "M6 4V2.5H10V4"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				strokeLinejoin: "round",
				d: "M3.75 4L4.5 13.5C4.54 14.06 5 14.5 5.57 14.5H10.43C11 14.5 11.46 14.06 11.5 13.5L12.25 4"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				stroke: "currentColor",
				strokeLinecap: "round",
				d: "M6.75 7V11.5M9.25 7V11.5"
			})
		] }));
		// src/client/locales.ts
		/**
		* Visible copy of the plugin, registered with the client locale service under one namespace (dsh's convention:
		* `ctx.locale.register(NS, { en, zh })`, components get `t` from `locale: NS` on their slot registration).
		* Other languages fall back to English through the locale service's fallback chain.
		*
		* Terms (docs/decisions.md, decision 48): "Coordinator" / 协调者 is the main session that delegates; a delegated session is an
		* "Executor Session" / "执行器 Session" (short "executor" / "执行器" in running text); its brief is an
		* "Assignment" / "派工". Keys keep the code words (thread, brief) so they can point at code.
		*/
		const NS = "dsh-coordinator";
		const en = {
			"panel": "Coordinator",
			"title": "Coordinator",
			"description": "A coordinator is a chat that plans the work, hands each task to its own Executor Session and follows it.",
			"openChat": "Open chat",
			"reopenChat": "Reopen chat",
			"opening": "Opening…",
			"newCoordinator": "New coordinator",
			"newCoordinator.busy": "Creating…",
			"chooseFolder": "Choose folder…",
			"chooseFolder.hint": "Create a coordinator in a folder you pick",
			"chooseFolder.label": "Folder for the new coordinator",
			"chooseFolder.create": "Create",
			"base.problem": "New coordinators can’t be created: {reason}",
			"coordinators.label": "Coordinators",
			"coordinator.select": "Show {title}",
			"coordinator.none": "No Executor Sessions",
			"coordinator.tag.archived": "Archived",
			"coordinator.tag.folderProblem": "Folder refused",
			"folder.label": "Folder",
			"folder.note": "New Executor Sessions start here. This chat stays in {home}.",
			"folder.change": "Change",
			"folder.changeAria": "Change the folder of {title}",
			"folder.pathLabel": "Folder path",
			"folder.placeholder": "/path/to/folder",
			"folder.save": "Save",
			"folder.cancel": "Cancel",
			"folder.manual": "Type the full path of the folder.",
			"folder.problem.title": "This coordinator can’t start Executor Sessions",
			"folder.problem.action": "Change folder",
			"archiveCoordinator": "Archive coordinator",
			"archiveCoordinator.title": "Archive “{title}”?",
			"archiveCoordinator.body": "Its chat and its finished Executor Sessions are archived. Nothing is deleted.",
			"archiveCoordinator.confirm": "Archive",
			"archiveCoordinator.force": "Stop and archive",
			"archiveCoordinator.cancel": "Cancel",
			"archiveCoordinator.removeWorkspace": "Also remove its workspace from the sidebar",
			"archiveCoordinator.removeWorkspace.note": "Files on disk are kept.",
			"archiveCoordinator.workspace.kept-shared": "The workspace of “{title}” stays in the sidebar because another coordinator uses it.",
			"archiveCoordinator.workspace.kept-has-sessions": "The workspace of “{title}” stays in the sidebar because it has other sessions.",
			"archiveCoordinator.workspace.kept-not-own": "The workspace of “{title}” stays in the sidebar because it was not created by the coordinator.",
			"archiveCoordinator.workspace.failed": "“{title}” is archived, but its workspace couldn’t be removed from the sidebar. You can remove it there.",
			"orphans.title": "Without coordinator",
			"orphans.description": "Their coordinator could not be restored. You can open or archive them.",
			"summary.attention.one": "{n} needs you",
			"summary.attention.other": "{n} need you",
			"summary.running": "{n} running",
			"summary.finished": "{n} finished",
			"threads.label": "Executor Sessions",
			"threads.loading": "Loading Executor Sessions",
			"empty.coordinators.title": "No coordinator yet",
			"empty.coordinators.body": "Start a coordinator and describe the work in its chat. Every task it hands off runs in its own Executor Session and shows up here.",
			"empty.title": "No Executor Sessions yet",
			"empty.body": "Describe the work in this coordinator’s chat. Every task it hands off shows up here.",
			"empty.action": "Open coordinator chat",
			"status.starting": "Starting",
			"status.running": "Running",
			"status.idle": "Standing by",
			"status.waiting-approval": "Waiting for approval",
			"status.waiting-question": "Waiting for answer",
			"status.needs-user": "Needs you",
			"status.done": "Completed",
			"status.failed": "Failed",
			"status.stopped": "Stopped",
			"report.progress": "Progress",
			"report.question": "Question",
			"report.result": "Result",
			"report.blocked": "Blocked",
			"row.open": "Open Executor Session {title}",
			"row.archive": "Archive",
			"row.archiveAria": "Archive Executor Session {title}",
			"row.archiving": "Archiving…",
			"time.justNow": "just now",
			"time.minutes": "{n} min ago",
			"time.hours": "{n} h ago",
			"time.yesterday": "yesterday",
			"time.days": "{n} days ago",
			"error.unreachable": "Can’t reach the coordinator service.",
			"error.failed": "The coordinator service returned an error.",
			"error.stale": "Showing the last known state.",
			"error.retry": "Retry",
			"error.open": "Couldn’t open the coordinator chat: {reason}",
			"error.openThread": "Couldn’t open “{title}”: {reason}",
			"error.archive": "Couldn’t archive “{title}”: {reason}",
			"error.create": "Couldn’t create a coordinator: {reason}",
			"error.folder": "Couldn’t change the folder: {reason}",
			"error.archiveCoordinator": "Couldn’t archive “{title}”: {reason}",
			"notice.dismiss": "Dismiss",
			"model.title": "No model available",
			"model.no-provider": "Set up a model provider in Settings › Models. The coordinator and its Executor Sessions can’t run until then.",
			"model.no-model": "Choose a model in the coordinator chat. Its Executor Sessions use the coordinator’s model.",
			"model.model-unavailable": "{model} isn’t available. Choose another model in the coordinator chat or check its provider in Settings › Models.",
			"model.action": "Choose a model",
			"problem.locked": "The coordinator runs in another DeepSeek Harness window",
			"problem.read-only": "Coordinator data is from a newer version and is not saved",
			"problem.state-reset": "The coordinator data was reset",
			"badge.one": "{n} Executor Session needs you",
			"badge.other": "{n} Executor Sessions need you",
			"origin.brief": "Assignment from the coordinator",
			"origin.message": "Message from the coordinator",
			"welcome.title": "Coordinator",
			"welcome.body": "Tell me what you want done. I split it into Executor Sessions, each with its own agent and folder, and report back as they finish. Approvals and questions from them come to you.",
			"welcome.examples": "For example",
			"welcome.example1": "Compare three static site generators and summarise the trade-offs",
			"welcome.example2": "Write a CSV word counter in Python and in Go, in two parallel Executor Sessions",
			"welcome.example3": "Draft release notes from the changelog in ~/dev/my-project",
			"welcome.panel": "Executor Sessions appear in the pane on the right and on the Coordinator page.",
			"pane.title": "Executor Sessions",
			"pane.label": "Executor Sessions of {title}",
			"pane.coordinatorAria": "Open the coordinator chat {title}",
			"pane.noCoordinator": "Without coordinator",
			"pane.overview": "Open the Coordinator page",
			"pane.current": "You are here",
			"pane.empty": "No Executor Sessions yet. Tasks this coordinator hands off show up here.",
			"pane.toggle": "Show Executor Sessions",
			"pane.toggle.attention.one": "Show Executor Sessions: {n} needs you",
			"pane.toggle.attention.other": "Show Executor Sessions: {n} need you",
			"decor.attention.one": "{n} Executor Session needs you",
			"decor.attention.other": "{n} Executor Sessions need you",
			"decor.running.one": "{n} Executor Session running",
			"decor.running.other": "{n} Executor Sessions running",
			"decor.total.one": "{n} Executor Session",
			"decor.total.other": "{n} Executor Sessions",
			"group.attention": "Needs you",
			"group.running": "Running",
			"group.idle": "Standing by",
			"group.finished": "Finished",
			"row.tooltip": "{title}\n{folder}",
			"row.team": "Team: {n} teammates, {working} working",
			"perm.title": "Executor Sessions run in",
			"perm.auto": "Auto review",
			"perm.badge": "EXP",
			"perm.ask": "Ask me",
			"perm.auto.description": "An automatic reviewer checks every action of an Executor Session and its teammates and sends risky ones to you for approval. No file sandbox. Applies to Executor Sessions started from now on, for every coordinator.",
			"perm.ask.description": "Workspace Write: Executor Sessions write only in their own folder and ask you before anything else. Their teammates work in the same folder sandbox but cannot ask you: anything outside it is refused for them. Applies to Executor Sessions started from now on, for every coordinator.",
			"perm.ask.forced": "Auto review is not on in this app, so Executor Sessions run in Workspace Write and ask you before acting outside their folder. To use Auto review, switch on Auto authorization review under Plugins.",
			"perm.confirm.title": "Enable Auto review (experimental)?",
			"perm.confirm.description": "Auto review runs without a sandbox. Before every tool call, the same model as the agent reviews whether to allow it; you approve or reject each call it denies. This feature is experimental, can falsely allow or deny actions, and uses additional tokens.",
			"perm.confirm.threads": "New Executor Sessions and their teammates will run this way without asking you first.",
			"perm.confirm.acknowledge": "I understand these risks and want to continue",
			"perm.confirm.cancel": "Cancel",
			"perm.confirm.enable": "Enable Auto review",
			"perm.note.auto": "Executor Sessions run on their own in Auto review by default: an automatic reviewer checks each action and sends risky ones to you for approval. There is no file sandbox in this mode. You can switch new ones to Ask me on the Coordinator page.",
			"perm.note.ask": "Executor Sessions run in Ask me mode (Workspace Write): they write only in their own folder and ask you before anything else. You can change this on the Coordinator page.",
			"perm.note.unavailable": "Auto review is not on, so Executor Sessions run in Ask me mode (Workspace Write) and ask you before acting outside their folder. To use Auto review, switch on Auto authorization review under Plugins.",
			"perm.note.change": "Change",
			"perm.note.autoHere": "Executor Sessions run on their own in Auto review by default: an automatic reviewer checks each action and sends risky ones to you for approval. There is no file sandbox in this mode. Pick Ask me above to approve their actions yourself.",
			"perm.note.askHere": "New Executor Sessions run in Ask me mode (Workspace Write): they write only in their own folder and ask you before anything else.",
			"row.mode.auto": "Runs in Auto review",
			"row.mode.ask": "Runs in Ask me (Workspace Write)",
			"action.confirm.detail": "Confirm folder {path}",
			"action.confirm.why.outside": "Outside the coordinator’s folder. The Executor Session starts only when you allow it.",
			"action.confirm.why.existing": "An existing folder inside the coordinator’s folder. The Executor Session starts only when you allow it.",
			"action.confirm.why.symlink": "The folder named in the chat is a link to this one. The Executor Session starts only when you allow it.",
			"action.confirm.why.thread-folder": "Another Executor Session already works in this folder. This one starts only when you allow it.",
			"action.confirm.why.coordinator-folder": "This is the coordinator’s own folder. The Executor Session starts only when you allow it.",
			"action.confirm.always": "“{always}” applies to every coordinator.",
			"action.allowOnce": "Allow once",
			"action.allowAlways": "Always allow",
			"action.deny": "Reject",
			"action.resume": "Resume",
			"action.resume.wakes": "Paused after {n} wake-ups",
			"action.resume.budget": "Paused after {n} turns today",
			"action.resume.peers": "Paused after {n} messages to other executors",
			"action.resume.why": "It woke the coordinator, ran or messaged other executors more often than allowed. It continues when you resume it or write in it.",
			"error.action": "Couldn’t update “{title}”: {reason}",
			"allowed.title": "Allowed folders",
			"allowed.description": "Executor Sessions may work in these folders and their subfolders without asking, when you name the folder in a coordinator chat. This list applies to every coordinator. After DeepSeek Harness restarts, each folder asks once more until you choose Always allow for it again.",
			"allowed.remove": "Remove",
			"allowed.removeAria": "Remove {path} from the allowed folders",
			"problem.state-dropped": "Some saved coordinators or Executor Sessions were ignored",
			"problem.save-failed": "Coordinator data can’t be saved",
			"problem.auto-unavailable": "Auto review is not loaded",
			"problem.bad-root": "The folder for new coordinators is refused",
			"problem.not-ready": "The coordinator isn’t ready",
			"loading": "Loading coordinators…",
			"reopenCoordinator": "Reopen",
			"reopenCoordinator.hint": "Bring this coordinator back with a new chat. Its archived Executor Sessions stay archived.",
			"coordinator.archivedNote": "Archived. Reopen brings it back with a new chat.",
			"coordinator.chatTitle": "Chat: {title}",
			"error.reopen": "Couldn’t reopen {title}",
			"orphans.noSession": "“{title}” has no coordinator and no session yet, so there is nothing to open. You can archive it.",
			"empty.archived": "Reopen this coordinator to hand it new work.",
			"archiveCoordinator.stops.one": "{n} Executor Session still works. Archiving stops it:",
			"archiveCoordinator.stops.other": "{n} Executor Sessions still work. Archiving stops them:",
			"archiveCoordinator.teammates.one": "{n} teammate still works",
			"archiveCoordinator.teammates.other": "{n} teammates still work",
			"archiveCoordinator.refused": "Some Executor Sessions still work.",
			"chooseFolder.typeAria": "Type the folder path for a new coordinator",
			"folder.typeAria": "Type a folder path for {title}",
			"picker.waiting": "Choose a folder in the folder dialog…",
			"picker.slow": "The folder dialog hasn’t answered. It may be behind this window. You can also type the path instead.",
			"picker.type": "Type a path",
			"picker.cancel": "Cancel",
			"prompt.title": "Executor prompt",
			"prompt.help": "Every Executor Session this coordinator starts gets this text as your standing instructions. Applies to sessions started after you save.",
			"prompt.placeholder": "For example: write tests before changing code, and ask before adding a dependency.",
			"prompt.count": "{n} / {max}",
			"prompt.over": "{n} / {max}: too long",
			"prompt.save": "Save",
			"prompt.saving": "Saving…",
			"prompt.revert": "Revert",
			"prompt.saved": "Saved",
			"prompt.unsaved": "Not saved",
			"prompt.failed": "Couldn’t save the Executor prompt: {reason}",
			"rename.action": "Rename",
			"rename.aria": "Rename {name}",
			"rename.label": "Coordinator name",
			"rename.hint": "Enter saves, Esc cancels.",
			"rename.empty": "Type a name.",
			"rename.long": "A name has at most {max} characters.",
			"rename.control": "A name can’t contain control characters.",
			"rename.taken": "Another coordinator already has this name.",
			"rename.failed": "Couldn’t rename: {reason}",
			"pane.archivedAria": "{title} is archived. Open it on the Coordinator page",
			"decor.none": "No Executor Sessions yet",
			"startChat": "Start chat",
			"chatHint.open": "Open this coordinator’s chat",
			"chatHint.archived": "Its chat is archived. Reopen chat starts a new chat in the same folder.",
			"chatHint.gone": "Its chat no longer exists. Reopen chat starts a new chat in the same folder.",
			"chatHint.none": "It has no chat yet. Start chat creates one in its folder.",
			"coordinator.tag.chat.archived": "Chat archived",
			"coordinator.tag.chat.gone": "Chat deleted",
			"coordinator.tag.chat.none": "No chat yet",
			"coordinator.chatNote.archived": "Its chat is archived. Reopen chat starts a new one in the same folder.",
			"coordinator.chatNote.gone": "Its chat no longer exists. Reopen chat starts a new one in the same folder.",
			"coordinator.chatNote.none": "It has no chat yet. Start chat creates one in its folder.",
			"deleteCoordinator": "Delete coordinator",
			"deleteCoordinator.title": "Delete “{title}”?",
			"deleteCoordinator.body": "Only the coordinator entry is removed from this page. Its sessions, folders and files stay.",
			"deleteCoordinator.archived.one": "Its {n} archived Executor Session leaves this list too; the session itself stays in the sidebar archive.",
			"deleteCoordinator.archived.other": "Its {n} archived Executor Sessions leave this list too; the sessions themselves stay in the sidebar archive.",
			"deleteCoordinator.cancel": "Cancel",
			"deleteCoordinator.confirm": "Delete",
			"error.delete": "Couldn’t delete {title}",
			"group.archived": "Archived",
			"archived.note": "Archived Executor Sessions stay in the sidebar archive. Show archived conversations there to open one.",
			"row.teamWorking.one": "{n} teammate still works",
			"row.teamWorking.other": "{n} teammates still work",
			"settings.summary": "Limits for Executor Sessions, loop brakes and defaults for new coordinators.",
			"settings.section.capacity": "Capacity",
			"settings.section.brakes": "Loop brakes",
			"settings.section.notices": "Notices to coordinators",
			"settings.section.behaviour": "Defaults",
			"settings.maxRunningThreads": "Executor Sessions running at once",
			"settings.maxRunningThreads.hint": "Across all coordinators. Further starts and wake-ups wait in a queue.",
			"settings.threadTurnBudget": "Daily turn budget per Executor Session",
			"settings.threadTurnBudget.hint": "Turns the executor, its coordinator, a peer or a schedule starts in 24 hours; your own turns do not count. 0 = no limit.",
			"settings.wakeMaxPerThread": "Wake-ups per Executor Session",
			"settings.wakeMaxPerThread.hint": "How often one executor may wake its coordinator within the wake window before it pauses.",
			"settings.wakeWindowMs": "Wake window (ms)",
			"settings.wakeWindowMs.hint": "Milliseconds; 600000 is 10 minutes.",
			"settings.peerMaxPerPair": "Messages between two Executor Sessions",
			"settings.peerMaxPerPair.hint": "Within the peer window, both directions together; past it, both executors pause until you resume them.",
			"settings.peerMaxPerThread": "Messages one Executor Session may send",
			"settings.peerMaxPerThread.hint": "To other executors within the peer window; past it, the sender pauses until you resume it.",
			"settings.peerWindowMs": "Peer window (ms)",
			"settings.peerWindowMs.hint": "Milliseconds; 600000 is 10 minutes.",
			"settings.noticeDebounceMs": "Notice quiet time (ms)",
			"settings.noticeDebounceMs.hint": "How long notices are collected before they go to the coordinator as one batch.",
			"settings.noticeMaxDelayMs": "Longest notice delay (ms)",
			"settings.noticeMaxDelayMs.hint": "The longest a notice waits for its batch.",
			"settings.threadPermission": "New Executor Sessions run in",
			"settings.threadPermission.auto": "Auto review",
			"settings.threadPermission.ask": "Ask me",
			"settings.threadPermission.hint": "Only the default until you pick on the Coordinator page; your choice there wins.",
			"settings.briefAs": "Assignments count as",
			"settings.briefAs.user": "Your prompt",
			"settings.briefAs.notice": "Agent message",
			"settings.briefAs.hint": "Your prompt: when you started the coordinator’s turn, Auto review treats the Assignment as your task. Agent message: always background facts.",
			"settings.coordinatorBase": "Folder for new coordinators",
			"settings.coordinatorBase.hint": "New coordinator makes each coordinator’s own folder here. Empty: next to dsh’s default workspace.",
			"settings.coordinatorBase.placeholder": "~/Documents/deepseek-harness",
			"settings.coordinatorExtraTools": "Extra tools for coordinators",
			"settings.coordinatorExtraTools.hint": "Tool names of other plugins or MCP servers, separated by commas. Tools that run commands, write, browse or spawn work are never added.",
			"settings.note": "Changes apply at once, without a restart. They are saved in this profile’s patch.",
			"settings.overridden": "Changed",
			"settings.reset": "Reset to default",
			"settings.invalid.count": "A whole number of at least {min}.",
			"settings.invalid.duration": "A number of milliseconds of at least {min}.",
			"settings.invalid.path": "An absolute folder path, or one starting with ~/.",
			"settings.invalid.list": "Tool names (letters, digits, _ . : -), at most 50.",
			"settings.invalid.choice": "Pick one of the options.",
			"settings.unavailable": "Whalepod is not loaded, so it cannot be configured right now.",
			"settings.readOnly": "This deployment stores settings read-only.",
			"settings.saveFailed": "dsh did not accept these values; they were left for you to correct.",
			"settings.save": "Save",
			"settings.saving": "Saving…"
		};
		const zh = {
			"panel": "协调者",
			"title": "协调者",
			"description": "协调者是一个对话：它规划工作，把每项任务交给独立的执行器 Session 并跟进进展。",
			"openChat": "打开对话",
			"reopenChat": "重新打开对话",
			"opening": "正在打开…",
			"newCoordinator": "新建协调者",
			"newCoordinator.busy": "正在创建…",
			"chooseFolder": "选择文件夹…",
			"chooseFolder.hint": "在你选择的文件夹中创建协调者",
			"chooseFolder.label": "新协调者的文件夹",
			"chooseFolder.create": "创建",
			"base.problem": "无法创建新的协调者：{reason}",
			"coordinators.label": "协调者",
			"coordinator.select": "查看 {title}",
			"coordinator.none": "没有执行器 Session",
			"coordinator.tag.archived": "已归档",
			"coordinator.tag.folderProblem": "文件夹被拒绝",
			"folder.label": "文件夹",
			"folder.note": "新的执行器 Session 从这里开始。此对话仍留在 {home}。",
			"folder.change": "更改",
			"folder.changeAria": "更改 {title} 的文件夹",
			"folder.pathLabel": "文件夹路径",
			"folder.placeholder": "/path/to/folder",
			"folder.save": "保存",
			"folder.cancel": "取消",
			"folder.manual": "请输入文件夹的完整路径。",
			"folder.problem.title": "此协调者无法启动执行器 Session",
			"folder.problem.action": "更改文件夹",
			"archiveCoordinator": "归档协调者",
			"archiveCoordinator.title": "归档“{title}”？",
			"archiveCoordinator.body": "它的对话和已结束的执行器 Session 会被归档，不会删除任何内容。",
			"archiveCoordinator.confirm": "归档",
			"archiveCoordinator.force": "停止并归档",
			"archiveCoordinator.cancel": "取消",
			"archiveCoordinator.removeWorkspace": "同时从侧边栏移除它的工作区",
			"archiveCoordinator.removeWorkspace.note": "磁盘上的文件会保留。",
			"archiveCoordinator.workspace.kept-shared": "“{title}”的工作区仍保留在侧边栏中，因为另一个协调者在使用它。",
			"archiveCoordinator.workspace.kept-has-sessions": "“{title}”的工作区仍保留在侧边栏中，因为其中还有其他会话。",
			"archiveCoordinator.workspace.kept-not-own": "“{title}”的工作区仍保留在侧边栏中，因为它不是由协调者创建的。",
			"archiveCoordinator.workspace.failed": "“{title}”已归档，但无法从侧边栏移除它的工作区。你可以在侧边栏中手动移除。",
			"orphans.title": "无协调者",
			"orphans.description": "它们的协调者无法恢复。你可以打开或归档它们。",
			"summary.attention.one": "{n} 个待你处理",
			"summary.attention.other": "{n} 个待你处理",
			"summary.running": "{n} 个运行中",
			"summary.finished": "{n} 个已结束",
			"threads.label": "执行器 Session",
			"threads.loading": "正在加载执行器 Session",
			"empty.coordinators.title": "还没有协调者",
			"empty.coordinators.body": "新建一个协调者，并在它的对话中描述要做的工作。它交出的每项任务都在独立的执行器 Session 中运行，并显示在这里。",
			"empty.title": "还没有执行器 Session",
			"empty.body": "在此协调者的对话中描述要做的工作。它交出的每项任务都会显示在这里。",
			"empty.action": "打开协调者对话",
			"status.starting": "启动中",
			"status.running": "运行中",
			"status.idle": "待命",
			"status.waiting-approval": "等待审批",
			"status.waiting-question": "等待回答",
			"status.needs-user": "需要你处理",
			"status.done": "已完成",
			"status.failed": "失败",
			"status.stopped": "已停止",
			"report.progress": "进展",
			"report.question": "问题",
			"report.result": "结果",
			"report.blocked": "受阻",
			"row.open": "打开执行器 Session {title}",
			"row.archive": "归档",
			"row.archiveAria": "归档执行器 Session {title}",
			"row.archiving": "正在归档…",
			"time.justNow": "刚刚",
			"time.minutes": "{n} 分钟前",
			"time.hours": "{n} 小时前",
			"time.yesterday": "昨天",
			"time.days": "{n} 天前",
			"error.unreachable": "无法连接协调者服务",
			"error.failed": "协调者服务返回错误",
			"error.stale": "显示的是最近一次获取的状态",
			"error.retry": "重试",
			"error.open": "无法打开协调者对话：{reason}",
			"error.openThread": "无法打开“{title}”：{reason}",
			"error.archive": "无法归档“{title}”：{reason}",
			"error.create": "无法创建协调者：{reason}",
			"error.folder": "无法更改文件夹：{reason}",
			"error.archiveCoordinator": "无法归档“{title}”：{reason}",
			"notice.dismiss": "关闭",
			"model.title": "没有可用的模型",
			"model.no-provider": "请在“设置 › 模型”中配置模型服务商。配置之前，协调者和它的执行器都无法运行。",
			"model.no-model": "请在协调者对话中选择模型。它的执行器使用协调者的模型。",
			"model.model-unavailable": "{model} 不可用。请在协调者对话中选择其他模型，或在“设置 › 模型”中检查其服务商。",
			"model.action": "选择模型",
			"problem.locked": "协调者正在另一个 DeepSeek Harness 窗口中运行",
			"problem.read-only": "协调者数据来自更新的版本，不会保存",
			"problem.state-reset": "协调者数据已重置",
			"badge.one": "{n} 个执行器 Session 待你处理",
			"badge.other": "{n} 个执行器 Session 待你处理",
			"origin.brief": "来自协调者的派工",
			"origin.message": "来自协调者的消息",
			"welcome.title": "协调者",
			"welcome.body": "告诉我你想完成什么。我会把工作拆分给多个执行器 Session，每个都有自己的智能体和文件夹，完成后向你汇报。它们的审批和问题会交给你处理。",
			"welcome.examples": "例如",
			"welcome.example1": "比较三个静态网站生成器并总结各自的取舍",
			"welcome.example2": "分两个并行的执行器 Session，用 Python 和 Go 各写一个 CSV 词频统计工具",
			"welcome.example3": "根据 ~/dev/my-project 的变更日志起草发布说明",
			"welcome.panel": "执行器 Session 会显示在右侧窗格和“协调者”页面中。",
			"pane.title": "执行器 Session",
			"pane.label": "{title} 的执行器 Session",
			"pane.coordinatorAria": "打开协调者对话 {title}",
			"pane.noCoordinator": "无协调者",
			"pane.overview": "打开协调者页面",
			"pane.current": "当前所在",
			"pane.empty": "还没有执行器 Session。此协调者交出的任务会显示在这里。",
			"pane.toggle": "查看执行器 Session",
			"pane.toggle.attention.one": "查看执行器 Session：{n} 个待你处理",
			"pane.toggle.attention.other": "查看执行器 Session：{n} 个待你处理",
			"decor.attention.one": "{n} 个执行器 Session 待你处理",
			"decor.attention.other": "{n} 个执行器 Session 待你处理",
			"decor.running.one": "{n} 个执行器 Session 运行中",
			"decor.running.other": "{n} 个执行器 Session 运行中",
			"decor.total.one": "{n} 个执行器 Session",
			"decor.total.other": "{n} 个执行器 Session",
			"group.attention": "待你处理",
			"group.running": "运行中",
			"group.idle": "待命",
			"group.finished": "已结束",
			"row.tooltip": "{title}\n{folder}",
			"row.team": "团队：{n} 名队友，{working} 名工作中",
			"perm.title": "执行器 Session 运行方式",
			"perm.auto": "自动审查",
			"perm.badge": "EXP",
			"perm.ask": "询问我",
			"perm.auto.description": "自动审查会检查执行器 Session 及其队友的每个操作，并把有风险的操作交给你审批。不使用文件沙箱。对之后启动的执行器生效，适用于所有协调者。",
			"perm.ask.description": "工作区内修改：执行器 Session 只在自己的文件夹内写入，其他操作都会先询问你。它们的队友在同一个文件夹沙箱中工作，但无法询问你：沙箱之外的操作会被直接拒绝。对之后启动的执行器生效，适用于所有协调者。",
			"perm.ask.forced": "此应用未启用自动审查，因此执行器 Session 以“工作区内修改”运行，在文件夹外操作前会询问你。如需自动审查，请在“插件”中开启“自动授权审查”。",
			"perm.confirm.title": "确认启用自动审查（实验）？",
			"perm.confirm.description": "自动审查不使用沙箱。每次工具调用前，都会由与当前智能体相同的模型进行审查；审查拒绝的调用由你批准或拒绝。此功能仍属实验性，可能误放行或误拒绝，并会消耗额外 token。",
			"perm.confirm.threads": "新的执行器 Session 及其队友将以此方式运行，不会事先询问你。",
			"perm.confirm.acknowledge": "我已了解这些风险，并愿意继续",
			"perm.confirm.cancel": "取消",
			"perm.confirm.enable": "启用自动审查",
			"perm.note.auto": "执行器 Session 默认以“自动审查”方式自主运行：自动审查会检查每个操作，并把有风险的操作交给你审批。此模式下没有文件沙箱。你可以在“协调者”页面把新的执行器切换为“询问我”。",
			"perm.note.ask": "执行器 Session 以“询问我”（工作区内修改）方式运行：只在自己的文件夹内写入，其他操作都会先询问你。可在“协调者”页面更改。",
			"perm.note.unavailable": "未启用自动审查，因此执行器 Session 以“询问我”（工作区内修改）方式运行，在文件夹外操作前会询问你。如需自动审查，请在“插件”中开启“自动授权审查”。",
			"perm.note.change": "更改",
			"perm.note.autoHere": "执行器 Session 默认以“自动审查”方式自主运行：自动审查会检查每个操作，并把有风险的操作交给你审批。此模式下没有文件沙箱。在上方选择“询问我”即可由你亲自审批。",
			"perm.note.askHere": "新的执行器 Session 以“询问我”（工作区内修改）方式运行：只在自己的文件夹内写入，其他操作都会先询问你。",
			"row.mode.auto": "以自动审查运行",
			"row.mode.ask": "以“询问我”（工作区内修改）运行",
			"action.confirm.detail": "确认文件夹 {path}",
			"action.confirm.why.outside": "位于协调者的文件夹之外。只有在你允许后，执行器才会启动。",
			"action.confirm.why.existing": "这是协调者文件夹中一个已有的文件夹。只有在你允许后，执行器才会启动。",
			"action.confirm.why.symlink": "聊天中提到的文件夹是指向此文件夹的链接。只有在你允许后，执行器才会启动。",
			"action.confirm.why.thread-folder": "另一个执行器已在此文件夹中工作。只有在你允许后，这个执行器才会启动。",
			"action.confirm.why.coordinator-folder": "这是协调者自己的文件夹。只有在你允许后，执行器才会启动。",
			"action.confirm.always": "“{always}”适用于所有协调者。",
			"action.allowOnce": "允许一次",
			"action.allowAlways": "始终允许",
			"action.deny": "拒绝",
			"action.resume": "继续",
			"action.resume.wakes": "唤醒 {n} 次后已暂停",
			"action.resume.budget": "今日运行 {n} 轮后已暂停",
			"action.resume.peers": "向其他执行器发送 {n} 条消息后已暂停",
			"action.resume.why": "它唤醒协调者、运行或向其他执行器发消息的次数超过了上限。你点击继续或在其中发消息后，它才会继续。",
			"error.action": "无法更新“{title}”：{reason}",
			"allowed.title": "允许的文件夹",
			"allowed.description": "当你在协调者对话中提到这些文件夹时，执行器 Session 无需询问即可在其中及其子文件夹内工作。此列表适用于所有协调者。DeepSeek Harness 重启后，每个文件夹会再询问一次，直到你再次选择“始终允许”。",
			"allowed.remove": "移除",
			"allowed.removeAria": "从允许的文件夹中移除 {path}",
			"problem.state-dropped": "部分已保存的协调者或执行器 Session 被忽略",
			"problem.save-failed": "无法保存协调者数据",
			"problem.auto-unavailable": "未加载自动审查",
			"problem.bad-root": "新协调者的文件夹设置被拒绝",
			"problem.not-ready": "协调者尚未就绪",
			"loading": "正在加载协调者…",
			"reopenCoordinator": "重新打开",
			"reopenCoordinator.hint": "恢复此协调者并新建对话。已归档的执行器 Session 保持归档。",
			"coordinator.archivedNote": "已归档。重新打开会恢复它并新建对话。",
			"coordinator.chatTitle": "对话：{title}",
			"error.reopen": "无法重新打开 {title}",
			"orphans.noSession": "“{title}”没有协调者，也还没有会话，因此无法打开。你可以将它归档。",
			"empty.archived": "重新打开此协调者后才能交给它新的工作。",
			"archiveCoordinator.stops.one": "{n} 个执行器 Session 仍在工作，归档会停止它：",
			"archiveCoordinator.stops.other": "{n} 个执行器 Session 仍在工作，归档会停止它们：",
			"archiveCoordinator.teammates.one": "{n} 名队友仍在工作",
			"archiveCoordinator.teammates.other": "{n} 名队友仍在工作",
			"archiveCoordinator.refused": "仍有执行器 Session 在工作。",
			"chooseFolder.typeAria": "输入新协调者的文件夹路径",
			"folder.typeAria": "为 {title} 输入文件夹路径",
			"picker.waiting": "请在文件夹对话框中选择文件夹…",
			"picker.slow": "文件夹对话框没有响应，它可能在此窗口后面。你也可以直接输入路径。",
			"picker.type": "输入路径",
			"picker.cancel": "取消",
			"prompt.title": "执行器提示词",
			"prompt.help": "此协调者启动的每个执行器 Session 都会收到这段文字，作为你的常驻指示。保存后启动的 Session 生效。",
			"prompt.placeholder": "例如：改代码前先写测试；添加依赖前先询问。",
			"prompt.count": "{n} / {max}",
			"prompt.over": "{n} / {max}：超出上限",
			"prompt.save": "保存",
			"prompt.saving": "正在保存…",
			"prompt.revert": "还原",
			"prompt.saved": "已保存",
			"prompt.unsaved": "未保存",
			"prompt.failed": "无法保存执行器提示词：{reason}",
			"rename.action": "重命名",
			"rename.aria": "重命名 {name}",
			"rename.label": "协调者名称",
			"rename.hint": "按 Enter 保存，按 Esc 取消。",
			"rename.empty": "请输入名称。",
			"rename.long": "名称最多 {max} 个字符。",
			"rename.control": "名称不能包含控制字符。",
			"rename.taken": "已有其他协调者使用这个名称。",
			"rename.failed": "无法重命名：{reason}",
			"pane.archivedAria": "{title} 已归档。在协调者页面中打开",
			"decor.none": "还没有执行器 Session",
			"startChat": "开始对话",
			"chatHint.open": "打开此协调者的对话",
			"chatHint.archived": "它的对话已归档。重新打开对话会在同一文件夹中新建对话。",
			"chatHint.gone": "它的对话已不存在。重新打开对话会在同一文件夹中新建对话。",
			"chatHint.none": "它还没有对话。开始对话会在它的文件夹中新建一个。",
			"coordinator.tag.chat.archived": "对话已归档",
			"coordinator.tag.chat.gone": "对话已删除",
			"coordinator.tag.chat.none": "还没有对话",
			"coordinator.chatNote.archived": "它的对话已归档。重新打开对话会在同一文件夹中新建一个。",
			"coordinator.chatNote.gone": "它的对话已不存在。重新打开对话会在同一文件夹中新建一个。",
			"coordinator.chatNote.none": "它还没有对话。开始对话会在它的文件夹中新建一个。",
			"deleteCoordinator": "删除协调者",
			"deleteCoordinator.title": "删除“{title}”？",
			"deleteCoordinator.body": "只会从此页面移除这个协调者条目。它的会话、文件夹和文件都会保留。",
			"deleteCoordinator.archived.one": "它的 {n} 个已归档执行器 Session 也会从此列表移除；会话本身仍保留在侧边栏的归档中。",
			"deleteCoordinator.archived.other": "它的 {n} 个已归档执行器 Session 也会从此列表移除；会话本身仍保留在侧边栏的归档中。",
			"deleteCoordinator.cancel": "取消",
			"deleteCoordinator.confirm": "删除",
			"error.delete": "无法删除 {title}",
			"group.archived": "已归档",
			"archived.note": "已归档的执行器 Session 保留在侧边栏的归档中。在侧边栏中显示已归档的对话即可打开。",
			"row.teamWorking.one": "{n} 名队友仍在工作",
			"row.teamWorking.other": "{n} 名队友仍在工作",
			"settings.summary": "执行器 Session 的上限、防循环限制以及新协调者的默认设置。",
			"settings.section.capacity": "容量",
			"settings.section.brakes": "防循环限制",
			"settings.section.notices": "发给协调者的通知",
			"settings.section.behaviour": "默认设置",
			"settings.maxRunningThreads": "同时运行的执行器 Session",
			"settings.maxRunningThreads.hint": "所有协调者合计。更多的启动和唤醒会排队等待。",
			"settings.threadTurnBudget": "每个执行器 Session 的每日轮次上限",
			"settings.threadTurnBudget.hint": "24 小时内由执行器自身、其协调者、同伴或定时任务开启的轮次；你自己开启的轮次不计入。0 = 不限。",
			"settings.wakeMaxPerThread": "每个执行器 Session 的唤醒次数",
			"settings.wakeMaxPerThread.hint": "一个执行器在唤醒时间窗内唤醒协调者的次数上限，超过后它会暂停。",
			"settings.wakeWindowMs": "唤醒时间窗（毫秒）",
			"settings.wakeWindowMs.hint": "毫秒；600000 即 10 分钟。",
			"settings.peerMaxPerPair": "两个执行器 Session 之间的消息数",
			"settings.peerMaxPerPair.hint": "同伴时间窗内双向合计；超过后两个执行器都会暂停，直到你让它们继续。",
			"settings.peerMaxPerThread": "一个执行器 Session 可发送的消息数",
			"settings.peerMaxPerThread.hint": "同伴时间窗内发给其他执行器的消息；超过后发送方会暂停，直到你让它继续。",
			"settings.peerWindowMs": "同伴时间窗（毫秒）",
			"settings.peerWindowMs.hint": "毫秒；600000 即 10 分钟。",
			"settings.noticeDebounceMs": "通知静默时间（毫秒）",
			"settings.noticeDebounceMs.hint": "通知先收集这么久，再作为一批发给协调者。",
			"settings.noticeMaxDelayMs": "通知最长延迟（毫秒）",
			"settings.noticeMaxDelayMs.hint": "一条通知等待成批发送的最长时间。",
			"settings.threadPermission": "新执行器 Session 的运行方式",
			"settings.threadPermission.auto": "自动审查",
			"settings.threadPermission.ask": "询问我",
			"settings.threadPermission.hint": "仅在你于“协调者”页面选择之前作为默认；你在那里的选择优先。",
			"settings.briefAs": "派工视为",
			"settings.briefAs.user": "你的指令",
			"settings.briefAs.notice": "智能体消息",
			"settings.briefAs.hint": "你的指令：当这一轮由你开启时，自动审查把派工当作你的任务。智能体消息：始终只作为背景信息。",
			"settings.coordinatorBase": "新协调者的文件夹",
			"settings.coordinatorBase.hint": "新建协调者时会在这里为每个协调者创建自己的文件夹。留空：放在 dsh 默认工作区旁边。",
			"settings.coordinatorBase.placeholder": "~/Documents/deepseek-harness",
			"settings.coordinatorExtraTools": "协调者的额外工具",
			"settings.coordinatorExtraTools.hint": "其他插件或 MCP 服务器的工具名，用逗号分隔。执行命令、写入、浏览或派生工作的工具永远不会加入。",
			"settings.note": "更改立即生效，无需重启，并保存在当前配置的补丁中。",
			"settings.overridden": "已更改",
			"settings.reset": "恢复默认",
			"settings.invalid.count": "至少为 {min} 的整数。",
			"settings.invalid.duration": "至少为 {min} 的毫秒数。",
			"settings.invalid.path": "绝对路径，或以 ~/ 开头的路径。",
			"settings.invalid.list": "工具名（字母、数字、_ . : -），最多 50 个。",
			"settings.invalid.choice": "请选择一个选项。",
			"settings.unavailable": "Whalepod 插件当前未加载，暂时无法配置。",
			"settings.readOnly": "本部署的设置为只读。",
			"settings.saveFailed": "dsh 没有接受这些值，已保留供你修改。",
			"settings.save": "保存",
			"settings.saving": "保存中…"
		};
		/** Plural key for a count: `<base>.one` or `<base>.other`. */
		function plural(base, n) {
			return `${base}.${n === 1 ? "one" : "other"}`;
		}
		// src/client/source.ts
		/** Error with a message fit for the panel; `unreachable` marks transport or missing-method failures. */
		var SourceError = class extends Error {
			unreachable;
			constructor(message, unreachable) {
				super(message);
				this.unreachable = unreachable;
			}
		};
		function unwrap(result) {
			if (result.ok) return result.value;
			const { code, message } = result.error;
			throw new SourceError(message || code, code === "gateway/internal");
		}
		function remoteSource(remote) {
			const get = () => {
				const value = remote();
				if (value === void 0) throw new SourceError("The coordinator service is not connected.", true);
				return value;
			};
			const call = async (run) => {
				let result;
				try {
					result = await run();
				} catch (error) {
					if (error instanceof SourceError) throw error;
					throw new SourceError(error instanceof Error ? error.message : String(error), true);
				}
				return unwrap(result);
			};
			return {
				kind: "remote",
				getState: (signal) => call(() => get().getState(signal)),
				ensureCoordinator: (coordinatorId, signal) => call(() => get().ensureCoordinator(coordinatorId === void 0 ? {} : { coordinatorId }, signal)),
				createCoordinator: (home, signal) => call(() => get().createCoordinator(home === void 0 ? {} : { home }, signal)),
				setCoordinatorFolder: (coordinatorId, path, signal) => call(() => get().setCoordinatorFolder({
					coordinatorId,
					path
				}, signal)),
				setExecutorPrompt: (coordinatorId, text, signal) => call(() => get().setExecutorPrompt({
					coordinatorId,
					text
				}, signal)),
				renameCoordinator: (coordinatorId, name, signal) => call(() => get().renameCoordinator({
					coordinatorId,
					name
				}, signal)),
				archiveCoordinator: (coordinatorId, { force, removeWorkspace }, signal) => call(() => get().archiveCoordinator({
					coordinatorId,
					...force ? { force } : {},
					...removeWorkspace ? { removeWorkspace } : {}
				}, signal)),
				archiveThread: async (id, signal) => {
					await call(() => get().archiveThread(id, signal));
				},
				deleteCoordinator: async (coordinatorId, signal) => {
					await call(() => get().deleteCoordinator({ coordinatorId }, signal));
				},
				setThreadPermission: (mode, signal) => call(() => get().setThreadPermission(mode, signal)),
				confirmFolder: async (id, decision, signal) => {
					await call(() => get().confirmFolder({
						id,
						decision
					}, signal));
				},
				removeAllowedFolder: async (path, signal) => {
					await call(() => get().removeAllowedFolder(path, signal));
				},
				resumeThread: async (id, signal) => {
					await call(() => get().resumeThread(id, signal));
				}
			};
		}
		// src/client/store.ts
		const FAST_POLL_MS = 1500;
		const SLOW_POLL_MS = 5e3;
		const ATTENTION = [
			"waiting-approval",
			"waiting-question",
			"needs-user"
		];
		const FINISHED = [
			"done",
			"failed",
			"stopped"
		];
		function needsUser(thread) {
			return ATTENTION.includes(thread.status);
		}
		const SELECTED_KEY = "dsh-coordinator:selected";
		function readSelected() {
			try {
				return window.localStorage.getItem(SELECTED_KEY) ?? void 0;
			} catch {
				return;
			}
		}
		var CoordinatorStore = class {
			source;
			snapshot;
			listeners = /* @__PURE__ */ new Set();
			timer;
			inflight;
			fastHolders = 0;
			disposed = false;
			constructor(source) {
				this.source = source;
				this.snapshot = {
					state: void 0,
					error: void 0,
					unreachable: false,
					loading: true,
					source: source.kind,
					selected: readSelected()
				};
				document.addEventListener("visibilitychange", this.onVisibility);
				this.schedule(0);
			}
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			getSnapshot = () => this.snapshot;
			/** Poll fast while the returned release is not called (the panel holds it while mounted). */
			holdFast() {
				this.fastHolders += 1;
				this.refresh();
				let released = false;
				return () => {
					if (released) return;
					released = true;
					this.fastHolders -= 1;
				};
			}
			/** Select a coordinator on the page (remembered per browser). */
			select(coordinatorId) {
				try {
					window.localStorage.setItem(SELECTED_KEY, coordinatorId);
				} catch {}
				if (this.snapshot.selected !== coordinatorId) this.publish({
					...this.snapshot,
					selected: coordinatorId
				});
			}
			/** Poll now, for example after an action changed host state. */
			refresh() {
				if (this.disposed) return;
				this.schedule(0);
			}
			dispose() {
				this.disposed = true;
				document.removeEventListener("visibilitychange", this.onVisibility);
				clearTimeout(this.timer);
				this.inflight?.abort();
				this.listeners.clear();
			}
			onVisibility = () => {
				if (document.visibilityState === "visible") this.schedule(0);
				else clearTimeout(this.timer);
			};
			schedule(delay) {
				clearTimeout(this.timer);
				if (this.disposed || document.visibilityState === "hidden") return;
				this.timer = setTimeout(() => {
					this.poll();
				}, delay);
			}
			async poll() {
				this.inflight?.abort();
				const controller = new AbortController();
				this.inflight = controller;
				try {
					const state = await this.source.getState(controller.signal);
					if (controller.signal.aborted) return;
					const previous = this.snapshot;
					if (previous.state?.revision !== state.revision || previous.state.epoch !== state.epoch || previous.error !== void 0 || previous.loading) this.publish({
						...previous,
						state,
						error: void 0,
						unreachable: false,
						loading: false
					});
				} catch (error) {
					if (controller.signal.aborted) return;
					const message = error instanceof Error ? error.message : String(error);
					const unreachable = !(error instanceof SourceError) || error.unreachable;
					const previous = this.snapshot;
					if (previous.error !== message || previous.loading) this.publish({
						...previous,
						error: message,
						unreachable,
						loading: false
					});
				} finally {
					if (this.inflight === controller) {
						this.inflight = void 0;
						this.schedule(this.fastHolders > 0 ? FAST_POLL_MS : SLOW_POLL_MS);
					}
				}
			}
			publish(next) {
				this.snapshot = next;
				for (const listener of this.listeners) listener();
			}
		};
		const GROUPS = [
			"attention",
			"running",
			"idle",
			"finished"
		];
		function groupOf(thread) {
			if (needsUser(thread)) return "attention";
			if (FINISHED.includes(thread.status)) return "finished";
			return thread.status === "idle" ? "idle" : "running";
		}
		/** Threads needing the user first, then running, idle and finished ones; newest update first within each group. */
		function sortThreads(threads) {
			const rank = (t) => GROUPS.indexOf(groupOf(t));
			return [...threads].sort((a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt);
		}
		function roleOf(snapshot, sessionId) {
			const state = snapshot.state;
			if (state === void 0 || typeof sessionId !== "string" || sessionId === "") return void 0;
			const coordinator = state.coordinators.find((c) => c.sessionId === sessionId);
			if (coordinator !== void 0) return {
				role: "coordinator",
				coordinatorId: coordinator.id
			};
			const thread = state.threads.find((x) => x.sessionId === sessionId);
			return thread === void 0 ? void 0 : {
				role: "thread",
				coordinatorId: thread.coordinatorId
			};
		}
		/** The coordinator a Session chat belongs to (its own record for a coordinator chat, the owner for a thread). */
		function coordinatorById(state, coordinatorId) {
			if (state === void 0 || coordinatorId === void 0 || coordinatorId === "") return void 0;
			return state.coordinators.find((c) => c.id === coordinatorId);
		}
		/**
		* The coordinator the page shows: the user's selection while it exists, else the last used one, else the newest live
		* one, else any (an archived one); undefined when there is none.
		*/
		function pickCoordinator(state, preferred) {
			if (state === void 0) return void 0;
			const list = state.coordinators;
			return list.find((c) => c.id === preferred) ?? list.find((c) => c.id === state.lastCoordinatorId && c.archived !== true) ?? list.find((c) => c.archived !== true) ?? list[0];
		}
		/** The threads of one coordinator. */
		function threadsOf(state, coordinatorId) {
			return state?.threads.filter((t) => t.coordinatorId === coordinatorId) ?? [];
		}
		/** Threads no listed coordinator owns: their record was dropped by state validation. */
		function orphanThreads(state) {
			if (state === void 0) return [];
			const ids = new Set(state.coordinators.map((c) => c.id));
			return state.threads.filter((t) => !ids.has(t.coordinatorId));
		}
		function isRunning(thread) {
			return thread.status === "running" || thread.status === "starting";
		}
		/** How many of a coordinator's threads need the user and how many run, for counts on rows and buttons. */
		function countsOf(state, coordinatorId) {
			const own = threadsOf(state, coordinatorId);
			return {
				attention: own.filter(needsUser).length,
				running: own.filter(isRunning).length,
				total: own.length
			};
		}
		/**
		* Whether a thread still works, as the host's archive rule counts it (threads.ts `working`): not idle or finished, or
		* waiting for its folder confirmation, or with teammates that still work (also after the Lead stopped). Archiving its
		* coordinator then needs `force`, which stops them.
		*/
		function isWorking(thread) {
			if (thread.action?.kind === "confirm-folder") return true;
			if ((thread.team?.working ?? 0) > 0) return true;
			return thread.status !== "idle" && !FINISHED.includes(thread.status);
		}
		/** Whether the page has no settled coordinator list yet: no state, or the host still validates its stored state. */
		function isLoading(state) {
			return state === void 0 || state.loading === true;
		}
		/** The name a coordinator is shown by; a host that predates names sends none, then the title stands in. */
		function nameOf(coordinator) {
			const name = typeof coordinator.name === "string" ? coordinator.name.trim() : "";
			return name !== "" ? name : coordinator.title;
		}
		/** The monogram of a name: its first character (a whole code point, so CJK and emoji stay intact), upper case. */
		function monogramOf(name) {
			const first = [...name.trim()][0];
			return first === void 0 ? "?" : first.toLocaleUpperCase();
		}
		/** Calm identity tones; each maps to a dsh theme token in styles.ts. Status colours (warning, error) are left out. */
		const TONES = [
			"blue",
			"violet",
			"green",
			"slate"
		];
		/** A stable tone for a name (the same name always gets the same tone, on every device). */
		function toneOf(name) {
			let hash = 0;
			for (const ch of name.trim().toLocaleLowerCase()) hash = hash * 31 + ch.codePointAt(0) >>> 0;
			return TONES[hash % TONES.length];
		}
		/** The host's limit for a coordinator's executor prompt. */
		const PROMPT_MAX = 4e3;
		/**
		* A quick check of a new name before the host sees it, as a locale key, or undefined when it looks fine. The host
		* decides; its refusal is shown as it comes. Unchanged names are not an error (saving them is a no-op).
		*/
		function nameProblem(name, coordinatorId, coordinators) {
			const trimmed = name.trim();
			if (trimmed === "") return "rename.empty";
			if ([...trimmed].length > 40) return "rename.long";
			if (/[\u0000-\u001f\u007f]/.test(trimmed)) return "rename.control";
			const lower = trimmed.toLocaleLowerCase();
			if (coordinators.some((c) => c.id !== coordinatorId && c.archived !== true && typeof c.name === "string" && c.name.trim().toLocaleLowerCase() === lower)) return "rename.taken";
		}
		/** Characters of an executor prompt as the host's limit counts them (UTF-16 units of the text, as `String.length`). */
		function promptLength(text) {
			return text.length;
		}
		/** A host reason as a short sentence for a notice: no "Error:" prefix, first letter upper case, a final full stop. */
		function sentence(reason) {
			const text = reason.trim().replace(/^error:\s*/i, "");
			if (text === "") return text;
			const first = text[0].toLocaleUpperCase() + text.slice(1);
			return /[.!?。！？]$/.test(first) ? first : `${first}.`;
		}
		function chatOf(coordinator) {
			if (coordinator.chat !== void 0) return coordinator.chat;
			return coordinator.sessionId === null || coordinator.chatArchived === true ? "archived" : "open";
		}
		/** A coordinator's archived Executor Sessions, newest first as the host sends them (at most 30). */
		function archivedThreadsOf(state, coordinatorId) {
			return state?.archivedThreads?.filter((t) => t.coordinatorId === coordinatorId) ?? [];
		}
		// src/client/ui.tsx
		/**
		* Small controls copied from dsh's ui-primitives (Button, StateDot, Tooltip; dsh 0.2.2, MIT) under the plugin's
		* `dco-` prefix, so the plugin depends on theme tokens only and not on a Harness client package.
		*/
		/** dsh's StateDot: a 10px slot with a 6px core, or the 14px breathing spinner for ongoing work. Decorative. */
		function StateDot({ state }) {
			if (state === "ongoing") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dco-spinner",
				"data-state": "ongoing",
				width: 14,
				height: 14,
				viewBox: "0 0 24 24",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					className: "dco-spinner-motion",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						className: "dco-spinner-track",
						cx: "12",
						cy: "12",
						r: "9.5"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						className: "dco-spinner-arc",
						cx: "12",
						cy: "12",
						r: "9.5"
					})]
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-dot",
				"data-state": state,
				"aria-hidden": "true"
			});
		}
		/** dsh's Button: 36px (`md`), 28px (`sm`), or the 32px page-heading capsule (`head`). */
		const Button = (0, react.forwardRef)(function Button({ variant = "ghost", size = "md", icon, className, children, ...rest }, ref) {
			const classes = [
				"dco-btn",
				`dco-btn-${variant}`,
				size === "md" ? "" : `dco-btn-${size}`,
				className ?? ""
			].filter(Boolean).join(" ");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref,
				type: "button",
				className: classes,
				...rest,
				children: [icon != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dco-btn-icon",
					children: icon
				}), children]
			});
		});
		/**
		* dsh's Tooltip, reduced: a bubble below the anchor on mouse hover or keyboard focus, portaled to the body so the
		* header's clipping cannot cut it, and kept inside the viewport with a 12px margin. Touch never opens it (an action
		* name is auxiliary on phones); Escape closes it. `delay` (ms) holds a hover-opened bubble back, for dense lists.
		*/
		function Tooltip({ label, delay = 0, children }) {
			const [at, setAt] = (0, react.useState)(void 0);
			const bubble = (0, react.useRef)(null);
			const timer = (0, react.useRef)(void 0);
			const show = (0, react.useCallback)((anchor) => {
				const rect = anchor.getBoundingClientRect();
				const end = rect.left + rect.width / 2 > window.innerWidth - 160;
				setAt({
					x: end ? rect.right : rect.left + rect.width / 2,
					y: rect.bottom + 8,
					end
				});
			}, []);
			const hide = (0, react.useCallback)(() => {
				clearTimeout(timer.current);
				setAt(void 0);
			}, []);
			(0, react.useEffect)(() => () => {
				clearTimeout(timer.current);
			}, []);
			(0, react.useLayoutEffect)(() => {
				const node = bubble.current;
				if (at === void 0 || node === null) return;
				const rect = node.getBoundingClientRect();
				const shift = rect.left < 12 ? 12 - rect.left : rect.right > window.innerWidth - 12 ? window.innerWidth - 12 - rect.right : 0;
				if (shift !== 0) node.style.marginLeft = `${shift}px`;
			}, [at]);
			(0, react.useEffect)(() => {
				if (at === void 0) return;
				const onKey = (event) => {
					if (event.key === "Escape") hide();
				};
				window.addEventListener("keydown", onKey);
				window.addEventListener("scroll", hide, true);
				return () => {
					window.removeEventListener("keydown", onKey);
					window.removeEventListener("scroll", hide, true);
				};
			}, [at, hide]);
			const own = children.props;
			const anchor = (0, react.cloneElement)(children, {
				onPointerEnter: (event) => {
					own.onPointerEnter?.(event);
					if (event.pointerType === "touch") return;
					const target = event.currentTarget;
					clearTimeout(timer.current);
					if (delay > 0) timer.current = setTimeout(() => {
						show(target);
					}, delay);
					else show(target);
				},
				onPointerLeave: (event) => {
					own.onPointerLeave?.(event);
					hide();
				},
				onFocus: (event) => {
					own.onFocus?.(event);
					if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget);
				},
				onBlur: (event) => {
					own.onBlur?.(event);
					hide();
				},
				onClick: (event) => {
					hide();
					own.onClick?.(event);
				}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [anchor, at !== void 0 && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				ref: bubble,
				className: "dco-tooltip",
				role: "tooltip",
				"data-align": at.end ? "end" : void 0,
				style: {
					left: at.x,
					top: at.y
				},
				children: label
			}), document.body)] });
		}
		// src/client/permission.tsx
		/**
		* How new threads run: the "Threads run in" control on the Coordinator page and the short note shown at the start
		* (the coordinator chat's welcome and the page's empty state).
		*
		* It mirrors dsh's own permission picker (@deepseek-ai/dsh-client-ui-permission-presets): the same labels, the `EXP`
		* badge on Auto review, one line of description per choice, and the same acknowledgement before Auto review is
		* switched on. dsh's own copy is used when its `permission.access` dictionary is loaded, so the wording is dsh's in
		* every language; the plugin's dictionary covers the rest.
		*/
		/** dsh's dictionary for the composer's permission picker, when loaded; falls back to the plugin's own keys. */
		function dshCopy(dsh, t) {
			return (dshKey, ownKey) => {
				const text = dsh?.(dshKey);
				return text !== void 0 && text !== "" && text !== dshKey && !text.endsWith(dshKey) ? text : t(ownKey);
			};
		}
		/** The one-line note under the opening turn and on the empty page: which mode threads start in. */
		function PermissionNote({ state, t, onChange, onPage = false }) {
			if (state === void 0) return null;
			const auto = state.effective === "auto";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-notice dco-perm-note",
				role: "note",
				"data-testid": "dco-permission-note",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-notice-icon",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconShield, { size: 14 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-notice-text",
						children: auto ? t(onPage ? "perm.note.autoHere" : "perm.note.auto") : state.mode === "auto" ? t("perm.note.unavailable") : t(onPage ? "perm.note.askHere" : "perm.note.ask")
					}),
					onChange !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-notice-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: onChange,
							children: t("perm.note.change")
						})
					})
				]
			});
		}
		/**
		* "Threads run in: Auto review EXP | Ask me", as a two-choice radio group with the selected choice's description.
		* Switching to Auto review asks for the same acknowledgement dsh asks for in the composer.
		*/
		function PermissionControl({ state, t, dsh, onSet }) {
			const copy = dshCopy(dsh, t);
			const labelId = (0, react.useId)();
			const [confirming, setConfirming] = (0, react.useState)(false);
			const [acknowledged, setAcknowledged] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			if (state === void 0) return null;
			const selected = state.autoAvailable ? state.mode : "ask";
			const set = async (mode) => {
				setBusy(true);
				setError(void 0);
				try {
					await onSet(mode);
					setConfirming(false);
					setAcknowledged(false);
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			};
			const pick = (mode) => {
				if (mode === selected || busy) return;
				if (mode === "auto") {
					setConfirming(true);
					setAcknowledged(false);
					return;
				}
				set("ask");
			};
			const options = [{
				mode: "auto",
				label: copy("auto.label", "perm.auto"),
				badge: copy("auto.badge", "perm.badge"),
				disabled: !state.autoAvailable
			}, {
				mode: "ask",
				label: t("perm.ask"),
				disabled: false
			}];
			const description = selected === "auto" ? t("perm.auto.description") : state.autoAvailable ? t("perm.ask.description") : t("perm.ask.forced");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dco-perm",
				"data-testid": "dco-permission",
				"aria-labelledby": labelId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-perm-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dco-perm-label",
							id: labelId,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconShield, { size: 14 }), t("perm.title")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dco-seg",
							role: "radiogroup",
							"aria-labelledby": labelId,
							children: options.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "radio",
								"aria-checked": selected === o.mode,
								className: "dco-seg-option",
								"data-testid": `dco-permission-${o.mode}`,
								disabled: o.disabled || busy,
								onClick: () => {
									pick(o.mode);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: o.label }), o.badge !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-seg-badge",
									children: o.badge
								})]
							}, o.mode))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-perm-desc",
						children: description
					}),
					confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-notice dco-perm-confirm",
						"data-tone": "warning",
						role: "alertdialog",
						"aria-label": copy("auto.confirm.title", "perm.confirm.title"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dco-notice-text",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: copy("auto.confirm.title", "perm.confirm.title") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-notice-detail",
									children: [
										copy("auto.confirm.description", "perm.confirm.description"),
										" ",
										t("perm.confirm.threads")
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dco-perm-ack",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: acknowledged,
										onChange: (e) => {
											setAcknowledged(e.currentTarget.checked);
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: copy("auto.confirm.acknowledge", "perm.confirm.acknowledge") })]
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dco-notice-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									setConfirming(false);
								},
								children: copy("confirm.cancel", "perm.confirm.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								size: "sm",
								disabled: !acknowledged || busy,
								"data-testid": "dco-permission-enable",
								onClick: () => {
									set("auto");
								},
								children: copy("auto.confirm.enable", "perm.confirm.enable")
							})]
						})]
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-perm-error",
						role: "alert",
						children: error
					})
				]
			});
		}
		// src/client/chrome.tsx
		/**
		* The plugin's pieces outside its own page: the sidebar entry icon, the session header button, the origin line
		* above coordinator-written messages in an Executor Session, and the welcome shown in a fresh coordinator chat.
		*/
		/**
		* Sidebar entry glyph; the sidebar owns the row, its label and selection. The count badge is decorative and counts
		* every coordinator's Executor Sessions that need the user.
		*/
		function PanelIcon({ size, useCoordinator, t }) {
			const count = useCoordinator((s) => s.state?.threads.filter(needsUser).length ?? 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dco-panel-icon",
				"data-testid": "dco-sidebar-icon",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCoordinator, { size }), count > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dco-badge",
					"data-testid": "dco-badge",
					"aria-hidden": "true",
					title: t(plural("badge", count), { n: count }),
					children: count > 9 ? "9+" : count
				})]
			});
		}
		/**
		* Session header utility, the 28px round icon button dsh's header utilities use, in every coordinator chat and
		* Executor Session (with a dot when one of that coordinator's Executor Sessions needs the user). It shows or hides
		* the side pane (side-pane.tsx), or opens the Coordinator page where dsh's right Sidebar is not loaded.
		*/
		function HeaderAction({ sessionId, useCoordinator, togglePane, t }) {
			const role = useCoordinator((s) => roleOf(s, sessionId)?.role);
			const coordinatorId = useCoordinator((s) => roleOf(s, sessionId)?.coordinatorId);
			const attention = useCoordinator((s) => coordinatorId === void 0 ? 0 : countsOf(s.state, coordinatorId).attention);
			if (role === void 0) return null;
			const label = attention > 0 ? t(plural("pane.toggle.attention", attention), { n: attention }) : t("pane.toggle");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
				label,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dco-icon-btn dco-header",
					"data-testid": "dco-back",
					"aria-label": label,
					onClick: togglePane,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCoordinator, { size: 16 }), attention > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-header-dot",
						"aria-hidden": "true"
					})]
				})
			});
		}
		/** Election for the chat's `conversation.chat.user.before` chain: a user row whose prompt id the plugin minted. */
		function originOf(owner) {
			if (owner.kind !== "user" || typeof owner.source !== "object" || owner.source === null) return null;
			const { kind, rpcId } = owner.source;
			if (kind !== "user" || typeof rpcId !== "string") return null;
			if (rpcId.startsWith("dsh-coordinator:brief:")) return "brief";
			if (rpcId.startsWith("dsh-coordinator:msg:")) return "message";
			return null;
		}
		/** One quiet line above the bubble, as dsh's shared-session origin line. */
		function OriginLine({ matched, t }) {
			const label = t(matched === "brief" ? "origin.brief" : "origin.message");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dco-origin",
				"data-testid": "dco-origin",
				title: label,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCoordinator, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label })]
			});
		}
		const EXAMPLES = [
			"welcome.example1",
			"welcome.example2",
			"welcome.example3"
		];
		/**
		* Welcome in a fresh coordinator chat, rendered as the tail of its opening turn: what the coordinator does and three
		* example asks that fill the composer (they do not send).
		*/
		function Welcome({ turn, sessionId, useCoordinator, fillDraft, goHome, t }) {
			const isCoordinator = useCoordinator((s) => roleOf(s, sessionId)?.role === "coordinator");
			const permission = useCoordinator((s) => s.state?.threadPermission);
			if (!isCoordinator || turn.turn !== 1 || turn.steps.length !== 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dco-welcome",
				"data-testid": "dco-welcome",
				"aria-labelledby": `dco-welcome-${sessionId}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", {
						className: "dco-welcome-title",
						id: `dco-welcome-${sessionId}`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCoordinator, { size: 16 }), t("welcome.title")]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("welcome.body") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-welcome-label",
						children: t("welcome.examples")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "dco-welcome-examples",
						children: EXAMPLES.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dco-pill",
							onClick: () => {
								fillDraft(t(key));
							},
							children: t(key)
						}) }, key))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-welcome-hint",
						children: t("welcome.panel")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PermissionNote, {
						state: permission,
						t,
						onChange: goHome
					})
				]
			});
		}
		// src/client/settings-fields.ts
		/** Sections of the page, in order. `threadsRoot` is legacy and not on the page (dsh offers only volatile fields). */
		const SETTINGS_SECTIONS = [
			{
				id: "capacity",
				fields: [{
					key: "maxRunningThreads",
					kind: "count",
					min: 1,
					integer: true
				}, {
					key: "threadTurnBudget",
					kind: "count",
					min: 0,
					integer: true
				}]
			},
			{
				id: "brakes",
				fields: [
					{
						key: "wakeMaxPerThread",
						kind: "count",
						min: 1,
						integer: true
					},
					{
						key: "wakeWindowMs",
						kind: "duration",
						min: 1e3
					},
					{
						key: "peerMaxPerPair",
						kind: "count",
						min: 1,
						integer: true
					},
					{
						key: "peerMaxPerThread",
						kind: "count",
						min: 1,
						integer: true
					},
					{
						key: "peerWindowMs",
						kind: "duration",
						min: 1e3
					}
				]
			},
			{
				id: "notices",
				fields: [{
					key: "noticeDebounceMs",
					kind: "duration",
					min: 0
				}, {
					key: "noticeMaxDelayMs",
					kind: "duration",
					min: 0
				}]
			},
			{
				id: "behaviour",
				fields: [
					{
						key: "threadPermission",
						kind: "choice",
						choices: ["auto", "ask"]
					},
					{
						key: "briefAs",
						kind: "choice",
						choices: ["user", "notice"]
					},
					{
						key: "coordinatorBase",
						kind: "path"
					},
					{
						key: "coordinatorExtraTools",
						kind: "list"
					}
				]
			}
		];
		/** Names accepted in `coordinatorExtraTools`, as parseConfig accepts them. */
		const TOOL_NAME = /^[\w.:-]{1,100}$/;
		/**
		* The codec of one field. Empty text clears the field (back to the default beneath the profile).
		* @param def - the field.
		*/
		function fieldCodec(def) {
			switch (def.kind) {
				case "count":
				case "duration": return {
					field: def.key,
					format: (value) => typeof value === "number" ? String(value) : "",
					parse: (text) => {
						const trimmed = text.trim();
						if (trimmed === "") return { kind: "clear" };
						if (!/^\d+(\.\d+)?$/.test(trimmed)) return void 0;
						const value = Number(trimmed);
						if (!Number.isFinite(value) || value < (def.min ?? 0)) return void 0;
						if (def.integer === true && !Number.isSafeInteger(value)) return void 0;
						return {
							kind: "set",
							value
						};
					}
				};
				case "choice": return {
					field: def.key,
					format: (value) => typeof value === "string" ? value : "",
					parse: (text) => {
						if (text === "") return { kind: "clear" };
						return def.choices?.includes(text) === true ? {
							kind: "set",
							value: text
						} : void 0;
					}
				};
				case "path": return {
					field: def.key,
					format: (value) => typeof value === "string" ? value : "",
					parse: (text) => {
						const trimmed = text.trim();
						if (trimmed === "") return { kind: "clear" };
						if (!(trimmed === "~" || trimmed.startsWith("~/") || trimmed.startsWith("/")) || /[\u0000-\u001F\u007F]/.test(trimmed)) return void 0;
						return {
							kind: "set",
							value: trimmed
						};
					}
				};
				case "list": return {
					field: def.key,
					format: (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string").join(", ") : "",
					parse: (text) => {
						const names = text.split(/[\s,]+/).map((name) => name.trim()).filter((name) => name !== "");
						if (names.length > 50 || names.some((name) => !TOOL_NAME.test(name))) return void 0;
						return {
							kind: "set",
							value: [...new Set(names)]
						};
					}
				};
			}
		}
		/** Every field of the page, flat. */
		function settingsFields() {
			return SETTINGS_SECTIONS.flatMap((section) => section.fields);
		}
		// src/client/settings.tsx
		/** The host entry id (the bundle patch's row id, kept from before the rename) and the bundle's package name. */
		const ENTRY_ID = "dsh-coordinator";
		const PACKAGE_NAME = "dsh-whalepod";
		/**
		* Mount the page while dsh's settings forms and the Plugins page exist (both optional: without them, no page).
		* @param ctx - the plugin's client context.
		*/
		function mountSettingsPage(ctx) {
			ctx.inject(["configForms", "slots"], (child) => {
				const forms = child.configForms;
				const slots = child.slots;
				const model = new _deepseek_ai_dsh_client_ui_primitives.SettingsFormModel(forms.get(ENTRY_ID), settingsFields().map(fieldCodec));
				const store = model.bind(() => ({
					...model.shell(),
					fields: Object.fromEntries(settingsFields().map((def) => [def.key, model.field(def.key)]))
				}));
				child.effect(() => () => {
					model.dispose();
				}, "dsh-coordinator: settings form");
				child.effect(() => forms.whileServed([ENTRY_ID], () => slots.inject("plugins.bundle.config", () => slots.register({
					name: "plugins.bundle.config",
					key: PACKAGE_NAME,
					locale: "dsh-coordinator",
					inject: () => ({
						hooks: { coordinatorSettings: store },
						...model.actions()
					})
				}, SettingsPage))), "dsh-coordinator: settings page");
			});
		}
		/** The page: grouped fields, one save. */
		function SettingsPage(props) {
			const { t } = props;
			const state = props.useCoordinatorSettings((snapshot) => snapshot);
			if (props.view === "summary") return t("settings.summary");
			const disabled = !state.writable || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
				labels: {
					unavailable: t("settings.unavailable"),
					readOnly: t("settings.readOnly"),
					saveFailed: t("settings.saveFailed"),
					save: t("settings.save"),
					saving: t("settings.saving")
				},
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [SETTINGS_SECTIONS.map((section) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dco-settings-section",
					"aria-labelledby": `dco-settings-${section.id}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "dco-settings-heading",
						id: `dco-settings-${section.id}`,
						children: t(`settings.section.${section.id}`)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dco-settings-grid",
						children: section.fields.map((def) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dco-settings-cell",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								def,
								state: state.fields[def.key],
								disabled,
								...props
							})
						}, def.key))
					})]
				}, section.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dco-settings-note",
					children: t("settings.note")
				})]
			});
		}
		function Field(props) {
			const { t, def, state, disabled } = props;
			const id = `dco-setting-${def.key}`;
			if (def.kind === "choice") {
				const current = state.text === "" ? def.choices[0] : state.text;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dco-settings-choice",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dco-settings-choice-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dco-settings-label",
								id: `${id}-label`,
								children: t(`settings.${def.key}`)
							}), state.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dco-settings-reset",
								disabled,
								onClick: () => {
									props.resetField(def.key);
								},
								children: t("settings.reset")
							}) : null]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id,
							label: t(`settings.${def.key}`),
							value: current,
							disabled,
							options: def.choices.map((choice) => ({
								value: choice,
								label: t(`settings.${def.key}.${choice}`)
							})),
							onChange: (value) => {
								props.edit(def.key, value);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dco-settings-hint",
							children: t(`settings.${def.key}.hint`)
						})
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
				id,
				label: t(`settings.${def.key}`),
				hint: t(`settings.${def.key}.hint`),
				overriddenLabel: t("settings.overridden"),
				resetLabel: t("settings.reset"),
				invalidLabel: t(`settings.invalid.${def.kind}`, { min: def.min ?? 0 }),
				numeric: def.kind === "count" || def.kind === "duration",
				disabled,
				...def.kind === "path" ? { placeholder: t("settings.coordinatorBase.placeholder") } : {},
				...state,
				onEdit: (text) => {
					props.edit(def.key, text);
				},
				onReset: () => {
					props.resetField(def.key);
				}
			});
		}
		// src/client/art.tsx
		/**
		* The empty-state picture of the Coordinator page, drawn in the manner of dsh's own empty-state art (the Automation
		* tasks page: a soft backdrop, stacked cards, a round badge, two sparkles) and painted only with dsh's illustration
		* tokens, so it follows the theme. The plugin's mascot is deliberately not used inside the app.
		*/
		function CoordinatorArt({ small = false }) {
			const w = small ? 84 : 112;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dco-art",
				width: w,
				height: w * 100 / 112,
				viewBox: "0 0 112 100",
				fill: "none",
				"aria-hidden": "true",
				focusable: "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
						cx: "57",
						cy: "93",
						rx: "27",
						ry: "3",
						className: "dco-art-shadow"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "12",
						y: "20",
						width: "88",
						height: "64",
						rx: "26",
						className: "dco-art-bg"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "28",
						y: "16",
						width: "44",
						height: "56",
						rx: "8",
						transform: "rotate(-9 50 44)",
						className: "dco-art-backing"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "38",
						y: "14",
						width: "44",
						height: "58",
						rx: "8",
						className: "dco-art-surface"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "46",
						y: "25",
						width: "5",
						height: "3",
						rx: "1.5",
						className: "dco-art-detail"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "54",
						y: "25",
						width: "20",
						height: "3",
						rx: "1.5",
						className: "dco-art-detail"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "46",
						y: "34",
						width: "5",
						height: "3",
						rx: "1.5",
						className: "dco-art-detail"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "54",
						y: "34",
						width: "16",
						height: "3",
						rx: "1.5",
						className: "dco-art-detail"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "46",
						y: "43",
						width: "5",
						height: "3",
						rx: "1.5",
						className: "dco-art-detail"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "54",
						y: "43",
						width: "12",
						height: "3",
						rx: "1.5",
						className: "dco-art-detail"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "80",
						cy: "64",
						r: "14",
						className: "dco-art-badge"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M80 56.5V61M80 61L74.5 68M80 61L85.5 68",
						className: "dco-art-line"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "80",
						cy: "56.5",
						r: "2.6",
						className: "dco-art-node"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "74.5",
						cy: "68",
						r: "2.6",
						className: "dco-art-node"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "85.5",
						cy: "68",
						r: "2.6",
						className: "dco-art-node"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M94 12V18M91 15H97",
						className: "dco-art-line"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M18 70V74M16 72H20",
						className: "dco-art-line"
					})
				]
			});
		}
		// src/client/executor-prompt.tsx
		/**
		* The "Executor prompt" row of a coordinator's detail: the user's standing instructions that every Executor Session
		* this coordinator starts gets (host: `setExecutorPrompt`, max 4000 characters). A text field that grows with its
		* text, a character count, Revert and Save, and a short "Saved" after a save. A poll that brings a new saved text
		* replaces the field only while the user has not changed it.
		*/
		const SAVED_MS = 2500;
		function ExecutorPrompt({ coordinator, t, onSave }) {
			const saved = coordinator.executorPrompt ?? "";
			const [draft, setDraft] = (0, react.useState)(saved);
			const [base, setBase] = (0, react.useState)(saved);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const [justSaved, setJustSaved] = (0, react.useState)(false);
			const field = (0, react.useRef)(null);
			const ids = {
				label: (0, react.useId)(),
				help: (0, react.useId)(),
				count: (0, react.useId)()
			};
			const archived = coordinator.archived === true;
			(0, react.useEffect)(() => {
				if (saved === base) return;
				if (draft === base) setDraft(saved);
				setBase(saved);
			}, [
				saved,
				base,
				draft
			]);
			(0, react.useEffect)(() => {
				if (!justSaved) return;
				const timer = setTimeout(() => {
					setJustSaved(false);
				}, SAVED_MS);
				return () => {
					clearTimeout(timer);
				};
			}, [justSaved]);
			const length = promptLength(draft);
			const over = length > PROMPT_MAX;
			const dirty = draft !== base;
			const save = async () => {
				if (!dirty || over || busy) return;
				setBusy(true);
				setError(void 0);
				try {
					await onSave(coordinator.id, draft);
					setBase(draft);
					setJustSaved(true);
				} catch (e) {
					setError(t("prompt.failed", { reason: e instanceof Error ? e.message : String(e) }));
				} finally {
					setBusy(false);
				}
			};
			const revert = () => {
				setDraft(base);
				setError(void 0);
				field.current?.focus();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-setting dco-setting-block",
				"data-testid": "dco-executor-prompt",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dco-setting-icon",
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconInstructions, { size: 16 })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dco-setting-main",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: "dco-setting-title",
							id: ids.label,
							htmlFor: `${ids.label}-field`,
							children: t("prompt.title")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dco-setting-desc",
							id: ids.help,
							children: t("prompt.help")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: field,
							id: `${ids.label}-field`,
							className: "dco-input dco-textarea",
							value: draft,
							rows: 3,
							spellCheck: true,
							placeholder: t("prompt.placeholder"),
							"aria-describedby": `${ids.help} ${ids.count}`,
							"aria-invalid": over || void 0,
							disabled: archived || busy,
							"data-testid": "dco-executor-prompt-field",
							onChange: (event) => {
								setDraft(event.currentTarget.value);
								setError(void 0);
								setJustSaved(false);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
									event.preventDefault();
									save();
								}
								if (event.key === "Escape" && dirty) {
									event.preventDefault();
									revert();
								}
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dco-prompt-foot",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-prompt-count",
									id: ids.count,
									"data-tone": over ? "danger" : void 0,
									"data-testid": "dco-executor-prompt-count",
									"aria-live": over ? "polite" : void 0,
									children: over ? t("prompt.over", {
										n: length,
										max: PROMPT_MAX
									}) : t("prompt.count", {
										n: length,
										max: PROMPT_MAX
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-prompt-state",
									role: "status",
									"data-testid": "dco-executor-prompt-state",
									children: [justSaved && !dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dco-saved",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, { size: 14 }), t("prompt.saved")]
									}), dirty && !busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dco-unsaved",
										children: t("prompt.unsaved")
									})]
								}),
								!archived && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-prompt-buttons",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										size: "sm",
										disabled: !dirty || busy,
										"data-testid": "dco-executor-prompt-revert",
										onClick: revert,
										children: t("prompt.revert")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "primary",
										size: "sm",
										disabled: !dirty || over || busy,
										"aria-busy": busy,
										"data-testid": "dco-executor-prompt-save",
										onClick: () => {
											save();
										},
										children: busy ? t("prompt.saving") : t("prompt.save")
									})]
								})
							]
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dco-field-error",
							role: "alert",
							children: error
						})
					]
				})]
			});
		}
		// src/client/thread-row.tsx
		/**
		* Thread row pieces shared by the Coordinator page and the threads side pane, so a thread looks the same in both:
		* the status glyph, the status word with its tone, the one-line detail, the relative time and the folder.
		*/
		const DOT = {
			"starting": "ongoing",
			"running": "ongoing",
			"idle": "idle",
			"waiting-approval": "warning",
			"waiting-question": "warning",
			"needs-user": "warning",
			"done": "done",
			"failed": "error",
			"stopped": "idle"
		};
		/** `~` for the home folder. Rows truncate long paths from the left, so the folder name stays visible. */
		function shortenCwd(cwd) {
			return cwd.replace(/^\/(Users|home)\/[^/]+(?=\/|$)/, "~");
		}
		function relativeTime(at, now, t) {
			const seconds = Math.max(0, Math.round((now - at) / 1e3));
			if (seconds < 45) return t("time.justNow");
			const minutes = Math.round(seconds / 60);
			if (minutes < 60) return t("time.minutes", { n: minutes });
			const hours = Math.round(minutes / 60);
			if (hours < 24) return t("time.hours", { n: hours });
			const days = Math.round(hours / 24);
			if (days === 1) return t("time.yesterday");
			if (days < 7) return t("time.days", { n: days });
			return new Date(at).toLocaleDateString(void 0, {
				month: "short",
				day: "numeric"
			});
		}
		/** Re-render relative times every 30 s without touching thread data. */
		function useNow() {
			const [now, setNow] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => {
					setNow(Date.now());
				}, 3e4);
				return () => {
					clearInterval(timer);
				};
			}, []);
			return now;
		}
		/**
		* What it waits on or why it failed, what its team does while it runs, else its last report, else the host's
		* one-line detail.
		*/
		function threadDetail(thread, t) {
			const action = thread.action;
			if (action?.kind === "confirm-folder") return t("action.confirm.detail", { path: shortenCwd(action.path) });
			if (action?.kind === "resume") return t(action.reason === "wakes" ? "action.resume.wakes" : action.reason === "peers" ? "action.resume.peers" : "action.resume.budget", { n: action.count });
			const report = thread.lastReport;
			const working = thread.team?.working ?? 0;
			if (FINISHED.includes(thread.status) && working > 0) return t(working === 1 ? "row.teamWorking.one" : "row.teamWorking.other", { n: working });
			if ((needsUser(thread) || thread.status === "failed") && thread.statusDetail !== void 0) return thread.statusDetail;
			if (thread.status === "running" && (thread.team?.working ?? 0) > 0 && thread.statusDetail !== void 0) return thread.statusDetail;
			return report !== void 0 ? `${t(`report.${report.kind}`)}: ${report.text}` : thread.statusDetail;
		}
		function ThreadGlyph({ status }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-glyph",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateDot, { state: DOT[status] ?? "idle" })
			});
		}
		/** The status word, amber while the thread needs the user and red when it failed. */
		function ThreadStatusText({ thread, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-meta dco-status",
				"data-testid": "dco-status",
				"data-attention": needsUser(thread) || void 0,
				"data-tone": thread.status === "failed" ? "danger" : void 0,
				children: t(`status.${thread.status}`)
			});
		}
		function ThreadTime({ at, now, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
				className: "dco-row-time",
				dateTime: new Date(at).toISOString(),
				children: relativeTime(at, now, t)
			});
		}
		/** Row tooltip: title and folder, the permission mode it runs in, and the team line when the lead works with members. */
		function threadTooltip(thread, t) {
			const base = t("row.tooltip", {
				title: thread.title || thread.id,
				folder: shortenCwd(thread.cwd)
			});
			const team = thread.team;
			const lines = [base];
			if (thread.permission !== void 0) lines.push(t(`row.mode.${thread.permission}`));
			if (team !== void 0) lines.push(t("row.team", {
				n: team.members,
				working: team.working
			}));
			return lines.join("\n");
		}
		/**
		* Open the session the user should look at: the team member's Session when a member waits on the user (its card is
		* there), else the thread lead's. Falls back to the lead when the member's Session cannot be opened.
		*/
		async function openThreadSession(open, thread, openCoordinator) {
			if (thread.sessionId === "") {
				if (openCoordinator !== void 0) await openCoordinator();
				return;
			}
			if (thread.attentionSessionId !== void 0 && needsUser(thread)) try {
				await open(thread.attentionSessionId);
				return;
			} catch {}
			await open(thread.sessionId);
		}
		/**
		* The buttons of a thread that waits for the user: Reject / Allow once / Always allow for a folder confirmation, in
		* the order and styles of dsh's own approval card, or Resume for a paused thread. `copy` takes dsh's approval
		* dictionary when it is loaded, so the labels read as dsh's own.
		*/
		function ThreadActions({ thread, t, copy, handlers, onError, compact = false }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const action = thread.action;
			if (action === void 0) return null;
			const run = (job) => {
				setBusy(true);
				job().catch((error) => {
					onError(thread, error instanceof Error ? error.message : String(error));
				}).finally(() => {
					setBusy(false);
				});
			};
			const size = "sm";
			if (action.kind === "confirm-folder") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-row-actions",
				"data-compact": compact || void 0,
				"data-testid": "dco-confirm",
				role: "group",
				"aria-label": t("action.confirm.detail", { path: action.path }),
				children: [!compact && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: "dco-row-actions-note",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", {
							className: "dco-row-actions-path",
							children: action.path
						}),
						" ",
						t(`action.confirm.why.${action.why}`),
						" ",
						t("action.confirm.always", { always: copy("allowAlways", "action.allowAlways") })
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dco-row-actions-buttons",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size,
							disabled: busy,
							"data-testid": "dco-confirm-deny",
							onClick: () => {
								run(() => handlers.confirmFolder(thread.id, "deny"));
							},
							children: copy("reject", "action.deny")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size,
							disabled: busy,
							"data-testid": "dco-confirm-once",
							onClick: () => {
								run(() => handlers.confirmFolder(thread.id, "once"));
							},
							children: copy("allowOnce", "action.allowOnce")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							size,
							disabled: busy,
							"data-testid": "dco-confirm-always",
							onClick: () => {
								run(() => handlers.confirmFolder(thread.id, "always"));
							},
							children: copy("allowAlways", "action.allowAlways")
						})
					]
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-row-actions",
				"data-compact": compact || void 0,
				"data-testid": "dco-paused",
				role: "group",
				children: [!compact && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dco-row-actions-note",
					children: t("action.resume.why")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dco-row-actions-buttons",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "primary",
						size,
						disabled: busy,
						"data-testid": "dco-resume",
						onClick: () => {
							run(() => handlers.resumeThread(thread.id));
						},
						children: t("action.resume")
					})
				})]
			});
		}
		// src/client/folder.tsx
		/**
		* Folder choice, shared by the page head (Choose folder...), the detail's folder row and the side pane's folder line.
		*
		* The native picker stays the primary action, but it can block: dsh web's `pickDirectory()` opens a dialog on the
		* machine that runs dsh and waits until it is answered, so with a browser on another computer it never returns. A
		* pending pick therefore shows a wait line with Cancel and a "Type a path" way out, says so after a few seconds, and
		* gives up by itself after a minute (the late answer is ignored). "Type a path" is also always available next to the
		* picker button, so nobody depends on the dialog.
		*/
		/** After this long without an answer the wait line says the dialog may be elsewhere. */
		const PICK_SLOW_MS = 8e3;
		/** After this long the pick is given up and the path field opens. */
		const PICK_TIMEOUT_MS = 6e4;
		/**
		* One pending native pick at a time. `start` resolves exactly once: with the picker's answer, `abandoned` on Cancel
		* or unmount, or `timeout`. A picker that answers after that is ignored.
		*/
		function usePendingPick(pickFolder) {
			const [pending, setPending] = (0, react.useState)(false);
			const [slow, setSlow] = (0, react.useState)(false);
			const finish = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => () => {
				finish.current?.({ kind: "abandoned" });
			}, []);
			return {
				pending,
				slow,
				start: (0, react.useCallback)(() => new Promise((resolve) => {
					finish.current?.({ kind: "abandoned" });
					let done = false;
					const timers = [setTimeout(() => {
						if (!done) setSlow(true);
					}, PICK_SLOW_MS), setTimeout(() => {
						end({ kind: "timeout" });
					}, PICK_TIMEOUT_MS)];
					const end = (outcome) => {
						if (done) return;
						done = true;
						for (const timer of timers) clearTimeout(timer);
						if (finish.current === end) {
							finish.current = void 0;
							setPending(false);
							setSlow(false);
						}
						resolve(outcome);
					};
					finish.current = end;
					setPending(true);
					setSlow(false);
					pickFolder().then(end, (error) => {
						end({
							kind: "unavailable",
							reason: error instanceof Error ? error.message : String(error)
						});
					});
				}), [pickFolder]),
				cancel: (0, react.useCallback)(() => {
					finish.current?.({ kind: "abandoned" });
				}, [])
			};
		}
		/** The wait line under a pending pick: what is going on, Type a path, and Cancel. */
		function PickWait({ slow, t, onType, onCancel, compact = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-pickwait",
				role: "status",
				"data-compact": compact || void 0,
				"data-testid": "dco-pick-wait",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-pickwait-icon",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateDot, { state: "ongoing" })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-pickwait-text",
						children: t(slow ? "picker.slow" : "picker.waiting")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dco-pickwait-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							"data-testid": "dco-pick-type",
							onClick: onType,
							children: t("picker.type")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							"data-testid": "dco-pick-cancel",
							onClick: onCancel,
							children: t("picker.cancel")
						})]
					})
				]
			});
		}
		/** Inline path field with Save and Cancel: typed instead of picked. */
		function PathField({ label, hint, initial, submit, busy, onSubmit, onCancel, t }) {
			const [value, setValue] = (0, react.useState)(initial);
			const inputId = (0, react.useId)();
			const input = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				input.current?.focus();
				input.current?.select();
			}, []);
			const path = value.trim();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: "dco-path",
				"data-testid": "dco-path-field",
				onSubmit: (event) => {
					event.preventDefault();
					if (path !== "" && !busy) onSubmit(path);
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: "dco-path-label",
						htmlFor: inputId,
						children: label
					}),
					hint !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-path-hint",
						children: hint
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dco-path-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: input,
							id: inputId,
							className: "dco-input dco-input-mono",
							type: "text",
							value,
							spellCheck: false,
							autoComplete: "off",
							dir: "ltr",
							placeholder: t("folder.placeholder"),
							disabled: busy,
							onChange: (event) => {
								setValue(event.currentTarget.value);
							},
							onKeyDown: (event) => {
								if (event.key === "Escape") {
									event.preventDefault();
									onCancel();
								}
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dco-path-buttons",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								disabled: busy,
								onClick: onCancel,
								children: t("folder.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								size: "sm",
								type: "submit",
								disabled: busy || path === "",
								"aria-busy": busy,
								"data-testid": "dco-path-save",
								children: submit
							})]
						})]
					})
				]
			});
		}
		/** "Type a path": a small text button on the page, an icon button with a tooltip in the narrow side pane. */
		function TypePathButton({ t, onClick, compact = false, disabled = false, label }) {
			if (compact) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
				label: t("picker.type"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dco-icon-btn dco-icon-btn-sm",
					"data-testid": "dco-type-path",
					"aria-label": label ?? t("picker.type"),
					disabled,
					onClick,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTextField, { size: 14 })
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "sm",
				className: "dco-quiet-btn",
				"data-testid": "dco-type-path",
				"aria-label": label,
				disabled,
				onClick,
				children: t("picker.type")
			});
		}
		/**
		* A coordinator's folder (where its new Executor Sessions start) with Change (the native picker) and Type a path.
		* On the page it is a settings row with the note under the path; in the side pane one muted line.
		*/
		function FolderLine({ coordinator, t, pickFolder, setFolder, compact = false }) {
			const [editing, setEditing] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const pick = usePendingPick(pickFolder);
			const archived = coordinator.archived === true;
			const name = nameOf(coordinator);
			const save = async (path) => {
				setBusy(true);
				setError(void 0);
				try {
					await setFolder(coordinator.id, path);
					setEditing(false);
				} catch (e) {
					setError(t("error.folder", { reason: e instanceof Error ? e.message : String(e) }));
				} finally {
					setBusy(false);
				}
			};
			const change = async () => {
				setError(void 0);
				const picked = await pick.start();
				if (picked.kind === "picked") await save(picked.path);
				else if (picked.kind === "unavailable" || picked.kind === "timeout") setEditing(true);
			};
			const type = () => {
				pick.cancel();
				setError(void 0);
				setEditing(true);
			};
			const buttons = !archived && !editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dco-folder-actions",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypePathButton, {
					t,
					compact,
					disabled: busy,
					onClick: type,
					label: t("folder.typeAria", { title: name })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: compact ? "ghost" : "outline",
					size: "sm",
					className: "dco-folder-change",
					disabled: busy || pick.pending,
					"aria-busy": busy || pick.pending,
					"aria-label": t("folder.changeAria", { title: name }),
					"data-testid": "dco-folder-change",
					onClick: () => {
						change();
					},
					children: t("folder.change")
				})]
			});
			const path = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-folder-path",
				title: coordinator.folder,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", {
					dir: "ltr",
					children: shortenCwd(coordinator.folder)
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-folder",
				"data-compact": compact || void 0,
				"data-testid": "dco-folder",
				children: [
					compact ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-folder-line",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dco-folder-icon",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolder, { size: 14 })
							}),
							path,
							buttons
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-setting",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dco-setting-icon",
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolder, { size: 16 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dco-setting-main",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dco-setting-title",
										children: t("folder.label")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dco-folder-value",
										children: path
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dco-setting-desc",
										children: t("folder.note", { home: shortenCwd(coordinator.home) })
									})
								]
							}),
							buttons
						]
					}),
					pick.pending && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PickWait, {
						slow: pick.slow,
						t,
						compact,
						onType: type,
						onCancel: pick.cancel
					}),
					editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PathField, {
						label: t("folder.pathLabel"),
						hint: t("folder.manual"),
						initial: coordinator.folder,
						submit: t("folder.save"),
						busy,
						t,
						onSubmit: (value) => {
							save(value);
						},
						onCancel: () => {
							setEditing(false);
							setError(void 0);
						}
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-field-error",
						role: "alert",
						children: error
					})
				]
			});
		}
		// src/client/identity.tsx
		/**
		* A coordinator's identity wherever it is shown: a small monogram tile in a calm tone derived from its name (dsh
		* theme tokens only, see styles.ts `.dco-mono`), the name itself, and the inline rename used on the page.
		*/
		/** The monogram tile; decorative (the name is always shown or labelled next to it). */
		function Monogram({ name, size = "md", muted = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-mono",
				"data-size": size,
				"data-tone": muted ? "muted" : toneOf(name),
				"aria-hidden": "true",
				children: monogramOf(name)
			});
		}
		/**
		* The coordinator's name as a heading with a pencil button; the pencil turns it into a text field where Enter saves and
		* Escape cancels. The host checks the name; its refusal shows under the field and the field stays open.
		*/
		function CoordinatorName({ coordinator, coordinators, t, onRename, headingId, disabled = false }) {
			const name = nameOf(coordinator);
			const [editing, setEditing] = (0, react.useState)(false);
			const [value, setValue] = (0, react.useState)(name);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const input = (0, react.useRef)(null);
			const pencil = (0, react.useRef)(null);
			const errorId = (0, react.useId)();
			(0, react.useEffect)(() => {
				if (editing) {
					input.current?.focus();
					input.current?.select();
				}
			}, [editing]);
			(0, react.useEffect)(() => {
				setEditing(false);
				setError(void 0);
			}, [coordinator.id]);
			const close = () => {
				setEditing(false);
				setError(void 0);
				setTimeout(() => {
					pencil.current?.focus();
				}, 0);
			};
			const save = async () => {
				const next = value.trim();
				if (next === name) {
					close();
					return;
				}
				const problem = nameProblem(next, coordinator.id, coordinators);
				if (problem !== void 0) {
					setError(t(problem, { max: 40 }));
					return;
				}
				setBusy(true);
				setError(void 0);
				try {
					await onRename(next);
					close();
				} catch (e) {
					setError(t("rename.failed", { reason: e instanceof Error ? e.message : String(e) }));
				} finally {
					setBusy(false);
				}
			};
			if (editing) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-rename",
				"data-testid": "dco-rename",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					ref: input,
					className: "dco-input dco-rename-input",
					type: "text",
					value,
					maxLength: 80,
					spellCheck: false,
					autoComplete: "off",
					"aria-label": t("rename.label"),
					"aria-invalid": error !== void 0 || void 0,
					"aria-describedby": errorId,
					disabled: busy,
					"data-testid": "dco-rename-input",
					onChange: (event) => {
						setValue(event.currentTarget.value);
						setError(void 0);
					},
					onKeyDown: (event) => {
						if (event.key === "Enter" && !event.nativeEvent.isComposing) {
							event.preventDefault();
							save();
						}
						if (event.key === "Escape") {
							event.preventDefault();
							close();
						}
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dco-rename-hint",
					id: errorId,
					role: error !== void 0 ? "alert" : void 0,
					"data-tone": error !== void 0 ? "danger" : void 0,
					children: error ?? t("rename.hint")
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-name-line",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: "dco-detail-title",
					id: headingId,
					"data-testid": "dco-detail-name",
					children: name
				}), !disabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
					label: t("rename.action"),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						ref: pencil,
						type: "button",
						className: "dco-icon-btn dco-rename-btn",
						"data-testid": "dco-rename-start",
						"aria-label": t("rename.aria", { name }),
						onClick: () => {
							setValue(name);
							setError(void 0);
							setEditing(true);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPencil, { size: 14 })
					})
				})]
			});
		}
		// src/client/panel.tsx
		/**
		* Coordinator home (the sidebar's "Coordinator" page): heading with New coordinator, Choose folder and Type a path,
		* the global "Executor Sessions run in" control, page-level notices, the coordinator list and the selected
		* coordinator's detail (name with rename, chat action, archive, folder and executor prompt settings, folder and model
		* notices, its Executor Sessions grouped like the side pane), then rows without a coordinator and the allowed
		* folders. Layout, row pattern and empty state follow dsh's Automation tasks and Plugins pages; see styles.ts.
		*/
		function errorText(error) {
			return error instanceof Error ? error.message : String(error);
		}
		const ThreadRow = (0, react.memo)(function ThreadRow({ thread, now, t, onOpen, onArchive, copy, handlers, onError, orphan = false }) {
			const [archiving, setArchiving] = (0, react.useState)(false);
			const summaryId = (0, react.useId)();
			const attention = needsUser(thread);
			const finished = FINISHED.includes(thread.status) || orphan;
			const detail = threadDetail(thread, t);
			const title = thread.title || thread.id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dco-item",
				"data-testid": "dco-thread",
				"data-thread-id": thread.id,
				"data-attention": attention || void 0,
				"data-finished": FINISHED.includes(thread.status) || void 0,
				"data-archivable": finished || void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dco-row",
						"aria-label": t("row.open", { title }),
						"aria-describedby": summaryId,
						title: threadTooltip(thread, t),
						onClick: () => {
							onOpen(thread);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadGlyph, { status: thread.status }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dco-row-content",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-row-line",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dco-row-title",
										children: title
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadTime, {
										at: thread.updatedAt,
										now,
										t
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-row-summary",
									id: summaryId,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadStatusText, {
										thread,
										t
									}), detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dco-meta",
										children: detail
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-row-path",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", { children: shortenCwd(thread.cwd) })
								})
							]
						})]
					}),
					!orphan && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadActions, {
						thread,
						t,
						copy,
						handlers,
						onError
					}),
					finished && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
						label: t("row.archive"),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dco-icon-btn dco-archive",
							"data-testid": "dco-archive",
							disabled: archiving,
							"aria-busy": archiving,
							"aria-label": archiving ? t("row.archiving") : t("row.archiveAria", { title }),
							onClick: () => {
								setArchiving(true);
								onArchive(thread).finally(() => {
									setArchiving(false);
								});
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArchive, { size: 16 })
						})
					})
				]
			});
		});
		/** The head's one-line count over all coordinators, each with a small tone dot. */
		function Summary({ threads, t }) {
			const attention = threads.filter(needsUser).length;
			const live = threads.filter((x) => x.status === "running" || x.status === "starting").length;
			const finished = threads.filter((x) => FINISHED.includes(x.status)).length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dco-summary",
				"data-testid": "dco-summary",
				children: threads.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					attention > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-stat",
						"data-tone": "warning",
						children: t(plural("summary.attention", attention), { n: attention })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-stat",
						"data-tone": "running",
						children: t("summary.running", { n: live })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-stat",
						"data-tone": "finished",
						children: t("summary.finished", { n: finished })
					})
				] })
			});
		}
		/** Placeholder of the coordinator list and detail while the state loads or the host still validates it. */
		function PageSkeleton({ t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-coords",
				"aria-busy": "true",
				"aria-label": t("loading"),
				"data-testid": "dco-loading",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "dco-clist",
						"aria-hidden": "true",
						children: [0, 1].map((i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: "dco-skeleton dco-skeleton-crow",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-mono" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dco-skeleton-lines",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" })]
							})]
						}, i))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-detail",
						"aria-hidden": "true",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dco-skeleton dco-skeleton-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-mono dco-skeleton-mono-lg" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-skeleton-lines",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" })]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dco-skeleton-card" }),
							[
								0,
								1,
								2
							].map((i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dco-skeleton",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-dot" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-skeleton-lines",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" })
									]
								})]
							}, i))
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-loading-note",
						role: "status",
						children: t("loading")
					})
				]
			});
		}
		function NoticeBox({ tone, icon = true, title, children, actions, testId, role = "status" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-notice",
				"data-tone": tone,
				role,
				"data-testid": testId,
				children: [
					icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-notice-icon",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconWarning, { size: 14 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "dco-notice-text",
						children: [title !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: title }), children !== void 0 && (title !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dco-notice-detail",
							children
						}) : children)]
					}),
					actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-notice-actions",
						children: actions
					})
				]
			});
		}
		function ModelNotice({ health, t, onChoose, busy }) {
			const reason = health.reason ?? "no-model";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBox, {
				tone: "warning",
				testId: "dco-model",
				title: t("model.title"),
				actions: reason !== "no-provider" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "sm",
					disabled: busy,
					onClick: onChoose,
					children: t("model.action")
				}) : void 0,
				children: t(`model.${reason}`, { model: health.model ?? "" })
			});
		}
		/** Folders the user chose "Always allow" for, each removable. Shown only when the list has entries. */
		function AllowedFolders({ folders, t, onRemove }) {
			const labelId = (0, react.useId)();
			const [busy, setBusy] = (0, react.useState)(void 0);
			if (folders.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dco-section",
				"data-testid": "dco-allowed",
				"aria-labelledby": labelId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: "dco-section-title",
						id: labelId,
						children: t("allowed.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-section-desc",
						children: t("allowed.description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "dco-allowed-list",
						children: folders.map((path) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: "dco-allowed-item",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dco-allowed-path",
								title: path,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", {
									dir: "ltr",
									children: shortenCwd(path)
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								disabled: busy === path,
								"aria-label": t("allowed.removeAria", { path }),
								"data-testid": "dco-allowed-remove",
								onClick: () => {
									setBusy(path);
									onRemove(path).finally(() => {
										setBusy(void 0);
									});
								},
								children: t("allowed.remove")
							})]
						}, path))
					})
				]
			});
		}
		function ProblemNotice({ problem, t }) {
			const tone = problem.kind === "state-reset" || problem.kind === "state-dropped" || problem.kind === "auto-unavailable" || problem.kind === "not-ready" ? "warning" : "danger";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-notice",
				"data-tone": tone,
				role: "status",
				"data-testid": "dco-problem",
				"data-kind": problem.kind,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dco-notice-icon",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconWarning, { size: 14 })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: "dco-notice-text",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t(`problem.${problem.kind}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-notice-detail",
						children: problem.detail
					})]
				})]
			});
		}
		/** One line of a coordinator's counts: needs you, running, or "No Executor Sessions". */
		function CoordinatorCounts({ counts, t }) {
			if (counts.total === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-meta",
				children: t("coordinator.none")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [counts.attention > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-meta dco-summary-attn",
				children: t(plural("summary.attention", counts.attention), { n: counts.attention })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dco-meta",
				children: t("summary.running", { n: counts.running })
			})] });
		}
		function CoordinatorList({ coordinators, selectedId, snapshot, t, onSelect }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: "dco-clist",
				"data-testid": "dco-coordinators",
				"aria-label": t("coordinators.label"),
				children: coordinators.map((c) => {
					const counts = countsOf(snapshot.state, c.id);
					const selected = c.id === selectedId;
					const name = nameOf(c);
					const archived = c.archived === true;
					const chat = chatOf(c);
					const refused = c.folderProblem !== void 0 && !archived;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
						className: "dco-citem",
						"data-coordinator-id": c.id,
						"data-archived": archived || void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dco-crow",
							"data-testid": "dco-coordinator",
							"aria-current": selected ? "true" : void 0,
							"aria-label": t("coordinator.select", { title: name }),
							title: `${c.title}\n${shortenCwd(c.home)}`,
							onClick: () => {
								onSelect(c.id);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Monogram, {
								name,
								size: "sm",
								muted: archived
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dco-row-content",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-row-line",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dco-row-title",
											children: name
										}),
										refused && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dco-crow-flag",
											role: "img",
											"aria-label": t("coordinator.tag.folderProblem"),
											"data-testid": "dco-coordinator-refused",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconWarning, { size: 13 })
										}),
										archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dco-tag",
											children: t("coordinator.tag.archived")
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-crow-meta",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoordinatorCounts, {
										counts,
										t
									}), !archived && chat !== "open" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dco-meta",
										"data-testid": "dco-coordinator-chat",
										children: t(`coordinator.tag.chat.${chat}`)
									})]
								})]
							})]
						})
					}, c.id);
				})
			});
		}
		/**
		* Archive coordinator: an inline confirmation naming the Executor Sessions that still work by the host's rule (they
		* are stopped too). When the host still refuses a plain Archive, its reason shows and the button turns into Stop and
		* archive.
		*/
		function ArchiveConfirm({ coordinator, working, t, onCancel, onConfirm }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const [removeWorkspace, setRemoveWorkspace] = (0, react.useState)(false);
			const [refused, setRefused] = (0, react.useState)(void 0);
			const force = working.length > 0 || refused !== void 0;
			const title = t("archiveCoordinator.title", { title: nameOf(coordinator) });
			const confirm = async () => {
				setBusy(true);
				try {
					await onConfirm(force, removeWorkspace);
				} catch (error) {
					if (!force) setRefused(sentence(errorText(error)));
					else throw error;
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-confirm",
				role: "alertdialog",
				"aria-label": title,
				"data-testid": "dco-archive-confirm",
				"data-force": force || void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-confirm-title",
						children: title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-confirm-body",
						children: t("archiveCoordinator.body")
					}),
					working.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-confirm-working",
						"data-testid": "dco-archive-working",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dco-confirm-body",
							children: t(plural("archiveCoordinator.stops", working.length), { n: working.length })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "dco-confirm-list",
							children: working.map((thread) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadGlyph, { status: thread.status }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-confirm-item",
									children: thread.title || thread.id
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-confirm-status",
									children: (thread.team?.working ?? 0) > 0 && FINISHED.includes(thread.status) ? t(plural("archiveCoordinator.teammates", thread.team.working), { n: thread.team.working }) : t(`status.${thread.status}`)
								})
							] }, thread.id))
						})]
					}),
					refused !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "dco-confirm-refused",
						role: "alert",
						"data-testid": "dco-archive-refused",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("archiveCoordinator.refused") }),
							" ",
							refused
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dco-check",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: removeWorkspace,
							disabled: busy,
							"data-testid": "dco-archive-remove-workspace",
							onChange: (event) => {
								setRemoveWorkspace(event.currentTarget.checked);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [t("archiveCoordinator.removeWorkspace"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dco-check-note",
							children: t("archiveCoordinator.removeWorkspace.note")
						})] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-confirm-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							disabled: busy,
							onClick: onCancel,
							children: t("archiveCoordinator.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							size: "sm",
							disabled: busy,
							"aria-busy": busy,
							"data-testid": "dco-archive-coordinator-confirm",
							onClick: () => {
								confirm().catch(() => void 0);
							},
							children: t(force ? "archiveCoordinator.force" : "archiveCoordinator.confirm")
						})]
					})
				]
			});
		}
		/**
		* A coordinator's archived Executor Sessions, collapsed under one heading. The rows only inform: an archived Session
		* is reopened from dsh's sidebar (with its archive shown), not from here.
		*/
		function ArchivedGroup({ rows, now, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const listId = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dco-tgroup dco-archived-group",
				"data-testid": "dco-group-archived",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dco-tgroup-head dco-tgroup-toggle",
					"aria-expanded": open,
					"aria-controls": listId,
					"data-testid": "dco-archived-toggle",
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("group.archived") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dco-pgroup-count",
							children: rows.length
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dco-pgroup-chevron",
							"data-expanded": open || void 0,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevron, { size: 12 })
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dco-archived-note",
					children: t("archived.note")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: "dco-list",
					id: listId,
					"aria-label": t("group.archived"),
					children: rows.map((thread) => {
						const detail = threadDetail(thread, t);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							className: "dco-item",
							"data-finished": true,
							"data-archived-row": true,
							"data-testid": "dco-archived-thread",
							title: threadTooltip(thread, t),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dco-row dco-row-static",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadGlyph, { status: thread.status }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-row-content",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dco-row-line",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dco-row-title",
											children: thread.title || thread.id
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadTime, {
											at: thread.updatedAt,
											now,
											t
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dco-row-summary",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadStatusText, {
											thread,
											t
										}), detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dco-meta",
											children: detail
										})]
									})]
								})]
							})
						}, thread.id);
					})
				})] })]
			});
		}
		/** Delete an archived coordinator: only its entry goes; its Sessions, folders and files stay. */
		function DeleteConfirm({ coordinator, archivedCount, t, onCancel, onConfirm }) {
			const [busy, setBusy] = (0, react.useState)(false);
			const title = t("deleteCoordinator.title", { title: nameOf(coordinator) });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-confirm",
				role: "alertdialog",
				"aria-label": title,
				"data-testid": "dco-delete-confirm",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-confirm-title",
						children: title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-confirm-body",
						children: t("deleteCoordinator.body")
					}),
					archivedCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-confirm-body dco-confirm-quiet",
						children: t(plural("deleteCoordinator.archived", archivedCount), { n: archivedCount })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-confirm-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							disabled: busy,
							onClick: onCancel,
							children: t("deleteCoordinator.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							size: "sm",
							disabled: busy,
							"aria-busy": busy,
							"data-testid": "dco-delete-coordinator-confirm",
							onClick: () => {
								setBusy(true);
								onConfirm().finally(() => {
									setBusy(false);
								});
							},
							children: t("deleteCoordinator.confirm")
						})]
					})
				]
			});
		}
		function CoordinatorPanel({ useCoordinator, t, dshPermission, dshApproval, openCoordinator, newCoordinator, pickFolder, setCoordinatorFolder, setExecutorPrompt, renameCoordinator, archiveCoordinator, deleteCoordinator, select, openSession, archiveThread, setThreadPermission, confirmFolder, removeAllowedFolder, resumeThread, refresh, holdFast }) {
			const snapshot = useCoordinator((s) => s);
			const now = useNow();
			const [busy, setBusy] = (0, react.useState)(void 0);
			const [notice, setNotice] = (0, react.useState)(void 0);
			const [newPath, setNewPath] = (0, react.useState)(false);
			const [archiving, setArchiving] = (0, react.useState)(void 0);
			const [deleting, setDeleting] = (0, react.useState)(void 0);
			const [info, setInfo] = (0, react.useState)(void 0);
			const pick = usePendingPick(pickFolder);
			(0, react.useEffect)(() => holdFast(), [holdFast]);
			const state = snapshot.state;
			const loading = isLoading(state);
			const coordinators = loading ? [] : state?.coordinators ?? [];
			const selected = loading ? void 0 : pickCoordinator(state, snapshot.selected);
			const orphans = loading ? [] : sortThreads(orphanThreads(state));
			snapshot.source;
			const problems = state?.problems ?? (state?.problem === void 0 ? [] : [state.problem]);
			const baseProblem = state?.base?.problem;
			const hostDown = problems.some((p) => p.kind === "locked" || p.kind === "not-ready") && coordinators.length === 0;
			const copy = dshCopy(dshApproval, t);
			const handlers = {
				confirmFolder: async (id, decision) => {
					await confirmFolder(id, decision);
					refresh();
				},
				resumeThread: async (id) => {
					await resumeThread(id);
					refresh();
				}
			};
			const say = (text, tone = "danger", title) => {
				setNotice(title === void 0 ? {
					text,
					tone
				} : {
					text,
					tone,
					title
				});
			};
			const actionError = (thread, reason) => {
				say(t("error.action", {
					title: thread.title,
					reason
				}));
			};
			const run = async (key, job, failure) => {
				setBusy(key);
				setNotice(void 0);
				try {
					await job();
				} catch (error) {
					failure(errorText(error));
				} finally {
					setBusy(void 0);
				}
			};
			const openChat = (coordinator) => {
				const reopen = coordinator.archived === true || chatOf(coordinator) !== "open";
				return run(`open:${coordinator.id}`, () => openCoordinator(coordinator.id), (reason) => {
					if (reopen) say(sentence(reason), "warning", t("error.reopen", { title: nameOf(coordinator) }));
					else say(t("error.open", { reason }));
				});
			};
			const create = (home) => run(home === void 0 ? "new" : "choose", async () => {
				await newCoordinator(home);
				setNewPath(false);
			}, (reason) => {
				say(t("error.create", { reason }));
			});
			const choose = async () => {
				setNotice(void 0);
				const picked = await pick.start();
				if (picked.kind === "picked") await create(picked.path);
				else if (picked.kind === "unavailable" || picked.kind === "timeout") setNewPath(true);
			};
			const typePath = () => {
				pick.cancel();
				setNotice(void 0);
				setNewPath(true);
			};
			const openThread = (thread) => {
				setNotice(void 0);
				if (thread.sessionId === "" && thread.coordinatorId === "") {
					say(t("orphans.noSession", { title: thread.title || thread.id }), "warning");
					return;
				}
				openThreadSession(openSession, thread, thread.coordinatorId === "" ? void 0 : () => openCoordinator(thread.coordinatorId)).catch((error) => {
					say(t("error.openThread", {
						title: thread.title,
						reason: errorText(error)
					}));
				});
			};
			const archive = async (thread) => {
				try {
					await archiveThread(thread.id);
					refresh();
				} catch (error) {
					say(t("error.archive", {
						title: thread.title,
						reason: errorText(error)
					}));
				}
			};
			const setFolder = async (coordinatorId, path) => {
				await setCoordinatorFolder(coordinatorId, path);
				refresh();
			};
			const failed = snapshot.error !== void 0;
			const errorNotice = failed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-notice",
				"data-tone": "danger",
				role: "alert",
				"data-testid": "dco-error",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-notice-icon",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconWarning, { size: 14 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "dco-notice-text",
						children: [
							snapshot.unreachable ? t("error.unreachable") : t("error.failed"),
							state !== void 0 && ` ${t("error.stale")}`,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dco-notice-detail",
								children: snapshot.error
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-notice-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: refresh,
							children: t("error.retry")
						})
					})
				]
			});
			const threadRows = (rows, orphan, label) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: "dco-list",
				"data-testid": orphan ? "dco-orphans" : "dco-threads",
				"aria-label": label,
				children: rows.map((thread) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadRow, {
					thread,
					now,
					t,
					onOpen: openThread,
					onArchive: archive,
					copy,
					handlers,
					onError: actionError,
					orphan
				}, thread.id))
			});
			let detail = null;
			if (selected !== void 0) {
				const archived = selected.archived === true;
				const chat = chatOf(selected);
				const chatGone = chat !== "open";
				const archivedRows = archivedThreadsOf(state, selected.id);
				const opening = busy === `open:${selected.id}`;
				const own = sortThreads(threadsOf(state, selected.id));
				const working = own.filter(isWorking);
				const health = selected.model;
				const name = nameOf(selected);
				const headingId = `dco-detail-${selected.id}`;
				const groups = /* @__PURE__ */ new Map();
				for (const thread of own) groups.set(groupOf(thread), [...groups.get(groupOf(thread)) ?? [], thread]);
				const chatLabel = opening ? t("opening") : archived ? t("reopenCoordinator") : t(chat === "none" ? "startChat" : chatGone ? "reopenChat" : "openChat");
				const chatHint = archived ? t("reopenCoordinator.hint") : t(`chatHint.${chat}`);
				const subtitle = archived ? t("coordinator.archivedNote") : chatGone ? t(`coordinator.chatNote.${chat}`) : selected.title !== "" && !selected.title.includes(name) ? t("coordinator.chatTitle", { title: selected.title }) : shortenCwd(selected.home);
				detail = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dco-detail",
					"data-testid": "dco-detail",
					"data-coordinator-id": selected.id,
					"data-archived": archived || void 0,
					"aria-labelledby": headingId,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dco-detail-head",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Monogram, {
									name,
									size: "lg",
									muted: archived
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dco-detail-id",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoordinatorName, {
										coordinator: selected,
										coordinators,
										t,
										headingId,
										disabled: archived,
										onRename: async (next) => {
											await renameCoordinator(selected.id, next);
											refresh();
										}
									}, selected.id), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dco-detail-sub",
										"data-testid": "dco-detail-sub",
										children: subtitle
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dco-detail-actions",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
											label: chatHint,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												variant: "outline",
												size: "head",
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChat, { size: 14 }),
												"data-testid": "dco-open-chat",
												"data-reopen": archived || chatGone || void 0,
												disabled: opening,
												"aria-busy": opening,
												onClick: () => {
													openChat(selected);
												},
												children: chatLabel
											})
										}),
										archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
											label: t("deleteCoordinator"),
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dco-icon-btn",
												"data-testid": "dco-delete-coordinator",
												"aria-label": t("deleteCoordinator"),
												"aria-expanded": deleting === selected.id,
												onClick: () => {
													setDeleting(deleting === selected.id ? void 0 : selected.id);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTrash, { size: 16 })
											})
										}),
										!archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
											label: t("archiveCoordinator"),
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dco-icon-btn",
												"data-testid": "dco-archive-coordinator",
												"aria-label": t("archiveCoordinator"),
												"aria-expanded": archiving === selected.id,
												onClick: () => {
													setArchiving(archiving === selected.id ? void 0 : selected.id);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconArchive, { size: 16 })
											})
										})
									]
								})
							]
						}),
						archiving === selected.id && !archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArchiveConfirm, {
							coordinator: selected,
							working,
							t,
							onCancel: () => {
								setArchiving(void 0);
							},
							onConfirm: async (force, removeWorkspace) => {
								let result;
								try {
									result = await archiveCoordinator(selected.id, {
										force,
										removeWorkspace
									});
								} catch (error) {
									if (!force) throw error;
									say(t("error.archiveCoordinator", {
										title: name,
										reason: errorText(error)
									}));
									setArchiving(void 0);
									return;
								}
								setArchiving(void 0);
								refresh();
								if (removeWorkspace && result.workspace !== void 0 && result.workspace !== "removed" && result.workspace !== "not-asked") {
									if (result.workspace === "failed") say(t("archiveCoordinator.workspace.failed", { title: name }), "warning");
									else setInfo(t(`archiveCoordinator.workspace.${result.workspace}`, { title: name }));
								}
							}
						}, selected.id),
						deleting === selected.id && archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeleteConfirm, {
							coordinator: selected,
							archivedCount: archivedRows.length,
							t,
							onCancel: () => {
								setDeleting(void 0);
							},
							onConfirm: async () => {
								try {
									await deleteCoordinator(selected.id);
									setDeleting(void 0);
									refresh();
								} catch (error) {
									setDeleting(void 0);
									say(sentence(errorText(error)), "warning", t("error.delete", { title: name }));
								}
							}
						}, `delete-${selected.id}`),
						selected.folderProblem !== void 0 && !archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBox, {
							tone: "warning",
							testId: "dco-folder-problem",
							title: t("folder.problem.title"),
							children: selected.folderProblem
						}),
						health !== void 0 && !health.ok && !archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelNotice, {
							health,
							t,
							busy: opening,
							onChoose: () => {
								openChat(selected);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dco-settings",
							"data-testid": "dco-settings",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderLine, {
								coordinator: selected,
								t,
								pickFolder,
								setFolder
							}, `folder-${selected.id}`), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExecutorPrompt, {
								coordinator: selected,
								t,
								onSave: async (id, text) => {
									await setExecutorPrompt(id, text);
									refresh();
								}
							}, `prompt-${selected.id}`)]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dco-threads-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: "dco-section-title",
								children: t("threads.label")
							}), own.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dco-section-count",
								children: own.length
							})]
						}),
						own.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dco-empty dco-empty-inline",
							role: "status",
							"data-testid": "dco-empty",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dco-empty-title",
								children: t("empty.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t(archived ? "empty.archived" : "empty.body") })]
						}) : GROUPS.map((group) => {
							const rows = groups.get(group);
							if (rows === void 0) return null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dco-tgroup",
								"data-testid": `dco-group-${group}`,
								"aria-label": t(`group.${group}`),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h4", {
									className: "dco-tgroup-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`group.${group}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dco-pgroup-count",
										"data-attention": group === "attention" || void 0,
										children: rows.length
									})]
								}), threadRows(rows, false, t(`group.${group}`))]
							}, group);
						}),
						archivedRows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArchivedGroup, {
							rows: archivedRows,
							now,
							t
						}, `archived-${selected.id}`)
					]
				});
			}
			let body;
			if (state === void 0) body = failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dco-empty",
				role: "alert",
				children: errorNotice
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageSkeleton, { t });
			else if (loading) body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PageSkeleton, { t });
			else if (coordinators.length === 0) body = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-empty dco-empty-page",
				role: "status",
				"data-testid": "dco-empty-coordinators",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoordinatorArt, {}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dco-empty-title",
						children: t("empty.coordinators.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("empty.coordinators.body") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dco-empty-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "outline",
							disabled: busy !== void 0 || baseProblem !== void 0 || hostDown || pick.pending,
							"aria-busy": busy === "new",
							"data-testid": "dco-empty-new",
							onClick: () => {
								create();
							},
							children: busy === "new" ? t("newCoordinator.busy") : t("newCoordinator")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PermissionNote, {
						state: state?.threadPermission,
						t,
						onPage: true
					})
				]
			});
			else body = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-coords",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoordinatorList, {
					coordinators,
					selectedId: selected?.id,
					snapshot,
					t,
					onSelect: (id) => {
						setNotice(void 0);
						select(id);
					}
				}), detail]
			});
			const newDisabled = busy !== void 0 || baseProblem !== void 0 || loading || hostDown;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dco-page",
				"data-testid": "dsh-coordinator-panel",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dco-scroll",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-content",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dco-head",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dco-heading",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
												tabIndex: -1,
												children: t("title")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dco-intro",
												children: t("description")
											}),
											!loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Summary, {
												threads: state?.threads ?? [],
												t
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dco-actions",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypePathButton, {
												t,
												disabled: newDisabled,
												onClick: typePath,
												label: t("chooseFolder.typeAria")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
												label: t("chooseFolder.hint"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
													variant: "outline",
													size: "head",
													"data-testid": "dco-choose-folder",
													disabled: newDisabled || pick.pending,
													"aria-busy": busy === "choose" || pick.pending,
													onClick: () => {
														choose();
													},
													children: t("chooseFolder")
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												variant: "primary",
												size: "head",
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChat, { size: 14 }),
												"data-testid": "dco-new-coordinator",
												disabled: newDisabled || pick.pending,
												"aria-busy": busy === "new",
												onClick: () => {
													create();
												},
												children: busy === "new" ? t("newCoordinator.busy") : t("newCoordinator")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dco-head-perm",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PermissionControl, {
											state: state?.threadPermission,
											t,
											dsh: dshPermission,
											onSet: async (mode) => {
												await setThreadPermission(mode);
												refresh();
											}
										})
									})
								]
							}),
							pick.pending && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PickWait, {
								slow: pick.slow,
								t,
								onType: typePath,
								onCancel: pick.cancel
							}),
							newPath && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PathField, {
								label: t("chooseFolder.label"),
								hint: t("folder.manual"),
								initial: state?.base?.path ?? "",
								submit: t("chooseFolder.create"),
								busy: busy === "choose",
								t,
								onSubmit: (path) => {
									create(path);
								},
								onCancel: () => {
									setNewPath(false);
								}
							}),
							false,
							problems.map((problem) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProblemNotice, {
								problem,
								t
							}, problem.kind)),
							baseProblem !== void 0 && !problems.some((p) => p.kind === "bad-root") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBox, {
								tone: "warning",
								testId: "dco-base-problem",
								children: t("base.problem", { reason: baseProblem })
							}),
							notice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBox, {
								tone: notice.tone,
								role: "alert",
								testId: "dco-notice",
								title: notice.title,
								actions: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										setNotice(void 0);
									},
									children: t("notice.dismiss")
								}),
								children: notice.text
							}),
							info !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NoticeBox, {
								icon: false,
								testId: "dco-info",
								actions: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										setInfo(void 0);
									},
									children: t("notice.dismiss")
								}),
								children: info
							}),
							state !== void 0 && errorNotice,
							body,
							orphans.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dco-section",
								"aria-labelledby": "dco-orphans-title",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										className: "dco-section-title",
										id: "dco-orphans-title",
										children: t("orphans.title")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dco-section-desc",
										children: t("orphans.description")
									}),
									threadRows(orphans, true, t("orphans.title"))
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AllowedFolders, {
								folders: loading ? [] : state?.allowedFolders ?? [],
								t,
								onRemove: async (path) => {
									try {
										await removeAllowedFolder(path);
										refresh();
									} catch (error) {
										say(errorText(error));
									}
								}
							})
						]
					})
				})
			});
		}
		// node_modules/.pnpm/@deepseek-ai+dsh-typert-protocol@0.2.2-rc.2_@deepseek-ai+cordis@4.1.0/node_modules/@deepseek-ai/dsh-typert-protocol/lib/types/remote-info.js
		/** Lazy assembly of generated Remote definitions using caller-supplied Zod; no runtime imports. */
		/**
		* Retain one generated definition per endpoint without constructing parsers or projections.
		* The class instance builds its shared descriptor/method index on first access;
		* input schemas and JSON Schema projections are cached only when requested.
		* @param spec - compiler-produced method facts and Zod factories.
		* @param zod - the generated artifact's Zod runtime for named-input parsers.
		* @returns a lazy, mountable info instance with no registration or transport effects.
		*/
		function createTypertRemoteInfo(spec, zod) {
			return new RemoteInfo(spec, zod);
		}
		var RemoteInfo = class {
			spec;
			zod;
			index;
			constructor(spec, zod) {
				this.spec = spec;
				this.zod = zod;
			}
			get package() {
				return this.spec.package;
			}
			get descriptors() {
				return this.resolve().descriptors;
			}
			get methods() {
				return this.resolve().methods;
			}
			resolve() {
				if (this.index !== void 0) return this.index;
				const zod = this.zod;
				const descriptors = [];
				const methods = Object.create(null);
				for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
					const separator = endpoint.indexOf("/");
					const namespace = endpoint.slice(0, separator);
					const method = endpoint.slice(separator + 1);
					const parameters = definition.parameters.map((parameter) => ({
						...parameter,
						wire: parameter.wire ?? parameter.name
					}));
					const descriptor = {
						...definition,
						id: `${this.spec.package}#${endpoint}`,
						namespace,
						method,
						parameters,
						result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
					};
					if (definition.invocation.kind === "direct") {
						const inputs = [];
						methods[endpoint] = Object.assign(descriptor, {
							input(options) {
								const strict = options?.strict === true;
								return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
							},
							invoke(remote, input, signal) {
								const named = input;
								const values = parameters.map((parameter) => named[parameter.wire]);
								if (definition.cancellation !== void 0) values.push(signal);
								const receiver = Reflect.get(remote, namespace);
								return Reflect.get(receiver, method).apply(receiver, values);
							}
						});
					}
					descriptors.push(descriptor);
				}
				return this.index = {
					descriptors,
					methods
				};
			}
		};
		function optional$1(parameter) {
			return parameter.source === "json" && parameter.acceptsUndefined === true;
		}
		var NamedInput = class {
			parameters;
			strict;
			zod;
			schema;
			projection;
			constructor(parameters, strict, zod) {
				this.parameters = parameters;
				this.strict = strict;
				this.zod = zod;
			}
			codec(parameter) {
				return this.strict ? parameter.strictCodec : parameter.codec;
			}
			create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
				const value = this.codec(parameter).create();
				return [parameter.wire, optional$1(parameter) ? value.optional() : value.nonoptional()];
			})));
			get jsonSchema() {
				return this.project().jsonSchema;
			}
			get jsonSchemaError() {
				return this.project().jsonSchemaError;
			}
			project() {
				if (this.projection !== void 0) return this.projection;
				const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
				if (unavailable !== void 0) return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
				return this.projection = { jsonSchema: {
					type: "object",
					properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
						...this.codec(parameter).jsonSchema,
						...parameter.description === void 0 ? {} : { description: parameter.description }
					}])),
					required: this.parameters.filter((parameter) => !optional$1(parameter)).map((parameter) => parameter.wire),
					additionalProperties: false
				} };
			}
		};
		var ResultValue = class {
			spec;
			projection;
			constructor(spec) {
				this.spec = spec;
			}
			get mode() {
				return this.spec.mode;
			}
			get typeSymbol() {
				return this.spec.typeSymbol;
			}
			get create() {
				return this.spec.create;
			}
			get decode() {
				return this.spec.decode;
			}
			get encode() {
				return this.spec.encode;
			}
			get description() {
				return this.spec.description;
			}
			get jsonSchemaError() {
				return this.spec.jsonSchemaError;
			}
			get jsonSchema() {
				if (this.projection === void 0) {
					const schema = this.spec.jsonSchema;
					this.projection = { value: schema === void 0 ? void 0 : {
						...schema,
						description: this.spec.description
					} };
				}
				return this.projection.value;
			}
		};
		// src/client/remote.ts
		/**
		* Client contribution for the host `coordinator` Remote namespace.
		*
		* dsh normally generates this file with @deepseek-ai/dsh-typert-generator, which only runs inside a
		* dsh-style workspace (tsconfig.host.json + packages/). Until the plugin adopts that layout, the spec is
		* written by hand in the same shape the generator emits. Keep it in sync with the `@Remote` methods
		* in ../index.ts: the host dispatches through the Gateway's source fallback, the client needs these
		* strict codecs to mount the methods on `ctx.remote.coordinator`.
		*/
		/** The package name, as the dsh generator writes it into a Remote spec (the plugin id stays `dsh-coordinator`). */
		const PACKAGE = "dsh-whalepod";
		const THREAD_STATUSES = [
			"starting",
			"running",
			"idle",
			"waiting-approval",
			"waiting-question",
			"needs-user",
			"done",
			"failed",
			"stopped"
		];
		const FOLDER_WHY = [
			"outside",
			"existing",
			"symlink",
			"thread-folder",
			"coordinator-folder"
		];
		const modelSchema = () => zod.z.object({
			ok: zod.z.boolean(),
			model: zod.z.string().optional(),
			reason: zod.z.enum([
				"no-provider",
				"no-model",
				"model-unavailable"
			]).optional().catch(void 0)
		});
		let coordinatorInfo;
		const coordinatorInfoSchema = () => coordinatorInfo ??= zod.z.object({
			id: zod.z.string(),
			sessionId: zod.z.string().nullable(),
			name: zod.z.string().catch(""),
			title: zod.z.string(),
			executorPrompt: zod.z.string().optional().catch(void 0),
			home: zod.z.string(),
			folder: zod.z.string(),
			folderProblem: zod.z.string().optional().catch(void 0),
			archived: zod.z.boolean().optional().catch(void 0),
			chatArchived: zod.z.boolean().optional().catch(void 0),
			chat: zod.z.enum([
				"open",
				"archived",
				"gone",
				"none"
			]).optional().catch(void 0),
			model: modelSchema().optional().catch(void 0),
			createdAt: zod.z.number(),
			updatedAt: zod.z.number()
		});
		let threadInfo;
		const threadSchema = () => threadInfo ??= zod.z.object({
			id: zod.z.string(),
			sessionId: zod.z.string(),
			title: zod.z.string(),
			cwd: zod.z.string(),
			status: zod.z.enum(THREAD_STATUSES).catch("idle"),
			statusDetail: zod.z.string().optional(),
			lastReport: zod.z.object({
				kind: zod.z.enum([
					"progress",
					"question",
					"result",
					"blocked"
				]).catch("progress"),
				text: zod.z.string(),
				at: zod.z.number()
			}).optional(),
			team: zod.z.object({
				members: zod.z.number(),
				working: zod.z.number()
			}).optional().catch(void 0),
			attentionSessionId: zod.z.string().optional(),
			permission: zod.z.enum(["auto", "ask"]).optional().catch(void 0),
			action: zod.z.union([zod.z.object({
				kind: zod.z.literal("confirm-folder"),
				path: zod.z.string(),
				why: zod.z.enum(FOLDER_WHY).catch("outside")
			}), zod.z.object({
				kind: zod.z.literal("resume"),
				reason: zod.z.enum([
					"wakes",
					"budget",
					"peers"
				]).catch("wakes"),
				count: zod.z.number()
			})]).optional().catch(void 0),
			coordinatorId: zod.z.string().catch(""),
			createdAt: zod.z.number(),
			updatedAt: zod.z.number()
		});
		let stateResult;
		const stateResultSchema = () => stateResult ??= zod.z.object({
			coordinators: zod.z.array(coordinatorInfoSchema()),
			revision: zod.z.number(),
			loading: zod.z.boolean().optional().catch(void 0),
			epoch: zod.z.string().optional(),
			lastCoordinatorId: zod.z.string().optional().catch(void 0),
			base: zod.z.object({
				path: zod.z.string(),
				problem: zod.z.string().optional()
			}).optional().catch(void 0),
			problem: problemSchema().optional().catch(void 0),
			problems: zod.z.array(problemSchema()).optional().catch(void 0),
			allowedFolders: zod.z.array(zod.z.string()).optional().catch(void 0),
			threadPermission: permissionStateSchema().optional().catch(void 0),
			threads: zod.z.array(threadSchema()),
			archivedThreads: zod.z.array(threadSchema()).optional().catch(void 0)
		});
		const PROBLEM_KINDS = [
			"locked",
			"read-only",
			"state-reset",
			"state-dropped",
			"save-failed",
			"auto-unavailable",
			"bad-root",
			"not-ready"
		];
		const problemSchema = () => zod.z.object({
			kind: zod.z.enum(PROBLEM_KINDS).catch("not-ready"),
			detail: zod.z.string()
		});
		let permissionState;
		const permissionStateSchema = () => permissionState ??= zod.z.object({
			mode: zod.z.enum(["auto", "ask"]).catch("ask"),
			autoAvailable: zod.z.boolean(),
			effective: zod.z.enum(["auto", "ask"]).catch("ask")
		});
		let permissionMode;
		const permissionModeSchema = () => permissionMode ??= zod.z.enum(["auto", "ask"]);
		let ensureRequest;
		const ensureRequestSchema = () => ensureRequest ??= zod.z.object({ coordinatorId: zod.z.string().optional() });
		let createRequest;
		const createRequestSchema = () => createRequest ??= zod.z.object({ home: zod.z.string().optional() });
		let ensureResult;
		const ensureResultSchema = () => ensureResult ??= zod.z.object({
			coordinatorId: zod.z.string(),
			sessionId: zod.z.string()
		});
		let folderRequest;
		const folderRequestSchema = () => folderRequest ??= zod.z.object({
			coordinatorId: zod.z.string(),
			path: zod.z.string()
		});
		let promptRequest;
		const promptRequestSchema = () => promptRequest ??= zod.z.object({
			coordinatorId: zod.z.string(),
			text: zod.z.string()
		});
		let renameRequest;
		const renameRequestSchema = () => renameRequest ??= zod.z.object({
			coordinatorId: zod.z.string(),
			name: zod.z.string()
		});
		let deleteRequest;
		const deleteRequestSchema = () => deleteRequest ??= zod.z.object({ coordinatorId: zod.z.string() });
		let deleteResult;
		const deleteResultSchema = () => deleteResult ??= zod.z.object({
			deleted: zod.z.string(),
			threads: zod.z.array(zod.z.string())
		});
		let archiveRequest;
		const archiveRequestSchema = () => archiveRequest ??= zod.z.object({
			coordinatorId: zod.z.string(),
			force: zod.z.boolean().optional(),
			removeWorkspace: zod.z.boolean().optional()
		});
		let archiveResult;
		const archiveResultSchema = () => archiveResult ??= zod.z.object({
			archived: zod.z.string(),
			threads: zod.z.array(zod.z.string()),
			workspace: zod.z.enum([
				"removed",
				"kept-shared",
				"kept-has-sessions",
				"kept-not-own",
				"failed",
				"not-asked"
			]).optional().catch(void 0)
		});
		let threadId;
		const threadIdSchema = () => threadId ??= zod.z.string();
		let voidResult;
		const voidResultSchema = () => voidResult ??= zod.z.unknown();
		let confirmRequest;
		const confirmRequestSchema = () => confirmRequest ??= zod.z.object({
			id: zod.z.string(),
			decision: zod.z.enum([
				"once",
				"always",
				"deny"
			])
		});
		let confirmResult;
		const confirmResultSchema = () => confirmResult ??= zod.z.object({
			id: zod.z.string(),
			started: zod.z.boolean()
		});
		let folderList;
		const folderListSchema = () => folderList ??= zod.z.array(zod.z.string());
		let folderPath;
		const folderPathSchema = () => folderPath ??= zod.z.string();
		let resumeResult;
		const resumeResultSchema = () => resumeResult ??= zod.z.object({ id: zod.z.string() });
		let pingResult;
		const pingResultSchema = () => pingResult ??= zod.z.object({
			ok: zod.z.literal(true),
			dshVersion: zod.z.string(),
			time: zod.z.string()
		});
		/** One JSON request parameter named `request`; `optional` mirrors a host `request?: T` (the client always sends an object). */
		function requestParameter(typeName, create, optional = false) {
			const codec = {
				mode: "strict",
				typeSymbol: `${PACKAGE}#${typeName}`,
				create
			};
			return {
				name: "request",
				source: "json",
				codec,
				strictCodec: codec,
				...optional ? { acceptsUndefined: true } : {}
			};
		}
		const TYPERT_REMOTE = createTypertRemoteInfo({
			package: PACKAGE,
			methods: {
				"coordinator/ping": {
					service: "coordinator",
					description: "Report that the host side of the plugin is alive.",
					invocation: { kind: "direct" },
					parameters: [],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#PingResult`,
						create: pingResultSchema
					}
				},
				"coordinator/getState": {
					service: "coordinator",
					description: "Return the coordinators, the thread list and a revision counter.",
					invocation: { kind: "direct" },
					parameters: [],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#CoordinatorState`,
						create: stateResultSchema
					}
				},
				"coordinator/ensureCoordinator": {
					service: "coordinator",
					description: "Open a coordinator: the named one (reopening its chat when archived), else the last used one, else a new one.",
					invocation: { kind: "direct" },
					parameters: [requestParameter("EnsureCoordinatorRequest", ensureRequestSchema, true)],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#EnsureCoordinatorResult`,
						create: ensureResultSchema
					}
				},
				"coordinator/createCoordinator": {
					service: "coordinator",
					description: "Create a new coordinator with its own home folder and chat Session.",
					invocation: { kind: "direct" },
					parameters: [requestParameter("CreateCoordinatorRequest", createRequestSchema, true)],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#EnsureCoordinatorResult`,
						create: ensureResultSchema
					}
				},
				"coordinator/setCoordinatorFolder": {
					service: "coordinator",
					description: "Change the folder new threads of a coordinator start in.",
					invocation: { kind: "direct" },
					parameters: [requestParameter("SetCoordinatorFolderRequest", folderRequestSchema)],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#CoordinatorInfo`,
						create: coordinatorInfoSchema
					}
				},
				"coordinator/setExecutorPrompt": {
					service: "coordinator",
					description: "Set the standing instructions every new Executor Session of a coordinator starts with; empty text clears them.",
					invocation: { kind: "direct" },
					parameters: [requestParameter("SetExecutorPromptRequest", promptRequestSchema)],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#CoordinatorInfo`,
						create: coordinatorInfoSchema
					}
				},
				"coordinator/renameCoordinator": {
					service: "coordinator",
					description: "Rename a coordinator; its chat title and sidebar group follow.",
					invocation: { kind: "direct" },
					parameters: [requestParameter("RenameCoordinatorRequest", renameRequestSchema)],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#CoordinatorInfo`,
						create: coordinatorInfoSchema
					}
				},
				"coordinator/archiveCoordinator": {
					service: "coordinator",
					description: "Archive a coordinator, its chat and its finished threads; with force also its working threads; optionally remove its Workspace.",
					invocation: { kind: "direct" },
					parameters: [requestParameter("ArchiveCoordinatorRequest", archiveRequestSchema)],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#ArchiveCoordinatorResult`,
						create: archiveResultSchema
					}
				},
				"coordinator/deleteCoordinator": {
					service: "coordinator",
					description: "Delete an archived coordinator entry; its Sessions, folders and files stay.",
					invocation: { kind: "direct" },
					parameters: [requestParameter("DeleteCoordinatorRequest", deleteRequestSchema)],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#DeleteCoordinatorResult`,
						create: deleteResultSchema
					}
				},
				"coordinator/archiveThread": {
					service: "coordinator",
					description: "Remove a finished thread from the list without deleting its Session.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "id",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#ThreadId`,
							create: threadIdSchema
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#ThreadId`,
							create: threadIdSchema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#Void`,
						create: voidResultSchema
					}
				},
				"coordinator/setThreadPermission": {
					service: "coordinator",
					description: "Set how new threads run: auto (auto review) or ask (workspace-write).",
					invocation: { kind: "direct" },
					parameters: [{
						name: "mode",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#ThreadPermission`,
							create: permissionModeSchema
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#ThreadPermission`,
							create: permissionModeSchema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#ThreadPermissionState`,
						create: permissionStateSchema
					}
				},
				"coordinator/confirmFolder": {
					service: "coordinator",
					description: "Answer a thread's folder confirmation: once, always or deny.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#FolderConfirmation`,
							create: confirmRequestSchema
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#FolderConfirmation`,
							create: confirmRequestSchema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#FolderConfirmationResult`,
						create: confirmResultSchema
					}
				},
				"coordinator/removeAllowedFolder": {
					service: "coordinator",
					description: "Remove a folder from the allowed folders.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "path",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#FolderPath`,
							create: folderPathSchema
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#FolderPath`,
							create: folderPathSchema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#FolderList`,
						create: folderListSchema
					}
				},
				"coordinator/resumeThread": {
					service: "coordinator",
					description: "Resume a thread the spend guards paused.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "id",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#ThreadId`,
							create: threadIdSchema
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: `${PACKAGE}#ThreadId`,
							create: threadIdSchema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: `${PACKAGE}#ResumeResult`,
						create: resumeResultSchema
					}
				}
			}
		}, zod.z);
		// src/client/row-decor.tsx
		/**
		* Left-sidebar Session row decorations for coordinator chats (ui-workspace's `sidebar.session.row.trailing` and
		* `sidebar.session.row.hover` seats). Executor Sessions are not grouped under their coordinator in the sidebar, so the
		* coordinator's row carries a small count of its Executor Sessions that need the user (warning tone) or run, and its
		* hover card names them. Both render nothing for any other Session. They read the shared store through the `hooks`
		* compartment, as every other registration does, and never bind the row's Session.
		*
		* Look: the forge panel's row icons (13px glyph in the row's 20px line, tertiary ink) and the schedule hover section
		* (the card is #2C2C2E in both themes, so its literal label colours are used; dsh 0.2.2, MIT).
		*/
		/** The coordinator id when `sessionId` is a coordinator chat, else undefined (a stable string for the selector). */
		function useCoordinatorOf(useCoordinator, sessionId) {
			return useCoordinator((s) => {
				const role = roleOf(s, sessionId);
				return role?.role === "coordinator" ? role.coordinatorId : void 0;
			});
		}
		/** Trailing row icon: the coordinator glyph with the count that matters most (needs you first, else running). */
		function CoordinatorRowTrailing({ sessionId, useCoordinator, t }) {
			const coordinatorId = useCoordinatorOf(useCoordinator, sessionId);
			const attention = useCoordinator((s) => coordinatorId === void 0 ? 0 : countsOf(s.state, coordinatorId).attention);
			const running = useCoordinator((s) => coordinatorId === void 0 ? 0 : countsOf(s.state, coordinatorId).running);
			if (coordinatorId === void 0 || attention === 0 && running === 0) return null;
			const n = attention > 0 ? attention : running;
			const label = attention > 0 ? t(plural("decor.attention", attention), { n: attention }) : t(plural("decor.running", running), { n: running });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dco-decor",
				role: "img",
				"aria-label": label,
				"data-testid": "dco-row-decor",
				"data-tone": attention > 0 ? "warning" : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCoordinator, { size: 13 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dco-decor-count",
					children: n > 99 ? "99+" : n
				})]
			});
		}
		/** Hover card section: the coordinator's name, then "3 Executor Sessions · 1 needs you · 2 running". */
		function CoordinatorRowHover({ sessionId, useCoordinator, t }) {
			const coordinatorId = useCoordinatorOf(useCoordinator, sessionId);
			const name = useCoordinator((s) => {
				const c = coordinatorById(s.state, coordinatorId);
				return c === void 0 ? void 0 : nameOf(c);
			});
			const total = useCoordinator((s) => coordinatorId === void 0 ? 0 : countsOf(s.state, coordinatorId).total);
			const attention = useCoordinator((s) => coordinatorId === void 0 ? 0 : countsOf(s.state, coordinatorId).attention);
			const running = useCoordinator((s) => coordinatorId === void 0 ? 0 : countsOf(s.state, coordinatorId).running);
			if (coordinatorId === void 0 || name === void 0) return null;
			const parts = [{ text: total === 0 ? t("decor.none") : t(plural("decor.total", total), { n: total }) }];
			if (attention > 0) parts.push({
				text: t(plural("summary.attention", attention), { n: attention }),
				tone: "warning"
			});
			if (running > 0) parts.push({ text: t("summary.running", { n: running }) });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-hover",
				"data-testid": "dco-row-hover",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Monogram, {
					name,
					size: "xs"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dco-hover-body",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-hover-title",
						children: name
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dco-hover-note",
						children: parts.map((part, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							"data-tone": part.tone,
							children: [i > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dco-hover-sep",
								children: "·"
							}), part.text]
						}, i))
					})]
				})]
			});
		}
		// src/client/side-pane.tsx
		/**
		* Threads side pane: a page-type tab in dsh's right Sidebar (`ctx.sidebarRightTabs` + the keyed
		* `sidebar.right.pane.tab` seat), shown beside the coordinator chat and thread sessions.
		*
		* It is scoped to one coordinator: in a coordinator chat it lists that coordinator's Executor Sessions, in an Executor
		* Session its siblings, under a top row that names the coordinator and opens its chat, and the coordinator's folder
		* with Change. Rows are grouped like a project sidebar (needs you, running, idle, finished; newest first in each
		* group). It reads the same `CoordinatorStore` as the page.
		*
		* Opening. The tab type has no guide entry, so dsh's guide page and its default-page rule stay untouched for every
		* other session. Whenever the coordinator chat or a thread comes on screen with its right column collapsed, the pane
		* opens, unless the user closed it before: collapsing the column while the pane is in it, or closing the pane, is
		* remembered per browser until the header button (chrome.tsx) opens it again. A column the user already uses for
		* something else is left alone. Below 768px dsh would open it fullscreen over the conversation, so it never opens by
		* itself there.
		*/
		/** Tab kind (what `openTab` names) and implementation id (the key the body registers under). */
		const PANE_KIND = "dsh-coordinator.threads";
		const PANE_ID = "dsh-coordinator/threads";
		/** dsh opens the right Sidebar fullscreen below this width (ui-sidebar-right "Presentations"). */
		const NARROW_PX = 768;
		const PREF_KEY = "dsh-coordinator:pane";
		const FINISHED_KEY = "dsh-coordinator:pane-finished";
		function read(key) {
			try {
				return window.localStorage.getItem(key);
			} catch {
				return null;
			}
		}
		function write(key, value) {
			try {
				if (value === null) window.localStorage.removeItem(key);
				else window.localStorage.setItem(key, value);
			} catch {}
		}
		function createPaneController(sidebar, store) {
			let suppressHide = false;
			let retry;
			const narrow = () => window.innerWidth < NARROW_PX;
			const shown = () => sidebar.mounted.getSnapshot() !== void 0 && sidebar.isExpanded() && sidebar.active()?.kind === "dsh-coordinator.threads";
			const open = (sessionId, attempt = 0) => {
				clearTimeout(retry);
				if (sidebar.mounted.getSnapshot() !== sessionId) return;
				try {
					sidebar.openTab(PANE_KIND);
				} catch {
					if (attempt < 10) retry = setTimeout(() => {
						open(sessionId, attempt + 1);
					}, 50);
				}
			};
			let decided;
			const evaluate = () => {
				const sessionId = sidebar.mounted.getSnapshot();
				if (sessionId !== decided) decided = void 0;
				if (sessionId === void 0 || decided !== void 0) return;
				if (roleOf(store.getSnapshot(), sessionId) === void 0) return;
				decided = sessionId;
				if (read(PREF_KEY) === "off" || narrow()) return;
				retry = setTimeout(() => {
					if (sidebar.mounted.getSnapshot() !== sessionId) return;
					try {
						if (sidebar.isExpanded()) return;
					} catch {}
					open(sessionId);
				}, 0);
			};
			const stopMounted = sidebar.mounted.subscribe(evaluate);
			const stopStore = store.subscribe(evaluate);
			evaluate();
			return {
				shown,
				toggle() {
					const sessionId = sidebar.mounted.getSnapshot();
					if (sessionId === void 0) return;
					if (shown()) {
						sidebar.toggleExpanded();
						write(PREF_KEY, "off");
					} else {
						write(PREF_KEY, null);
						open(sessionId);
					}
				},
				hidden(sessionId) {
					if (suppressHide) return;
					setTimeout(() => {
						if (suppressHide || sidebar.mounted.getSnapshot() !== sessionId) return;
						try {
							if (!sidebar.isExpanded()) write(PREF_KEY, "off");
						} catch {}
					}, 0);
				},
				leaveFullscreen() {
					if (!narrow() || !shown()) return;
					suppressHide = true;
					try {
						sidebar.toggleExpanded();
					} finally {
						setTimeout(() => {
							suppressHide = false;
						}, 0);
					}
				},
				dispose() {
					suppressHide = true;
					clearTimeout(retry);
					stopMounted();
					stopStore();
					const tabs = sidebar.openTabs?.getSnapshot() ?? [];
					for (const tab of tabs) if (tab.kind === "dsh-coordinator.threads") sidebar.closeIn?.(tab.sessionId, tab.tabId);
				}
			};
		}
		/**
		* Report a collapse of the column, or the pane leaving it, which may be the user closing it. The chip title stays
		* mounted while the pane sits in an expanded strip, also behind another tab, so the title carries this.
		*/
		function useHiddenReport(expanded, sessionId, hidden) {
			const wasExpanded = (0, react.useRef)(expanded);
			(0, react.useEffect)(() => {
				if (wasExpanded.current && !expanded) hidden(sessionId);
				wasExpanded.current = expanded;
			}, [
				expanded,
				hidden,
				sessionId
			]);
			(0, react.useEffect)(() => () => {
				hidden(sessionId);
			}, [hidden, sessionId]);
		}
		/** Chip title: the coordinator glyph before the type's label, as dsh's own page tabs carry a glyph. */
		function PaneTitle({ useTabInfo, sessionId, hidden, t }) {
			useHiddenReport(useTabInfo().sidebar.expanded, sessionId, hidden);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCoordinator, {
				size: 16,
				className: "dco-pane-title-icon"
			}), t("pane.title")] });
		}
		/** Up/Down move between the pane's buttons, Home/End jump to the first and last (a list's roving keys). */
		function onListKey(event) {
			if (![
				"ArrowDown",
				"ArrowUp",
				"Home",
				"End"
			].includes(event.key)) return;
			const items = [...event.currentTarget.querySelectorAll("[data-pane-item]")];
			const index = items.indexOf(document.activeElement);
			if (index < 0) return;
			const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : Math.min(items.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)));
			event.preventDefault();
			items[next]?.focus();
		}
		function PaneRow({ thread, current, now, t, onOpen, copy, handlers, onError }) {
			const title = thread.title || thread.id;
			const detail = threadDetail(thread, t);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dco-pitem",
				"data-testid": "dco-pane-thread",
				"data-thread-id": thread.id,
				"data-finished": groupOf(thread) === "finished" || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
					label: threadTooltip(thread, t),
					delay: 500,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dco-prow",
						"data-pane-item": true,
						"aria-current": current ? "page" : void 0,
						onClick: () => {
							onOpen(thread);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadGlyph, { status: thread.status }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dco-prow-content",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dco-prow-line",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-prow-title",
									children: title
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadTime, {
									at: thread.updatedAt,
									now,
									t
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dco-prow-status",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadStatusText, {
									thread,
									t
								}), detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-meta",
									children: detail
								})]
							})]
						})]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadActions, {
					thread,
					t,
					copy,
					handlers,
					onError,
					compact: true
				})]
			});
		}
		function readFinishedOpen() {
			return read(FINISHED_KEY) === "open";
		}
		function ThreadsPane({ useTabInfo, sessionId, useCoordinator, t, dshApproval, openThread, openCoordinator, goHome, pickFolder, setCoordinatorFolder, holdFast, refresh, hidden, confirmFolder, resumeThread }) {
			const { sidebar, tab } = useTabInfo();
			const snapshot = useCoordinator((s) => s);
			const now = useNow();
			const [finishedOpen, setFinishedOpen] = (0, react.useState)(readFinishedOpen);
			const [notice, setNotice] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => tab.visible ? holdFast() : void 0, [tab.visible, holdFast]);
			useHiddenReport(sidebar.expanded, sessionId, hidden);
			const state = snapshot.state;
			const loading = isLoading(state);
			const role = roleOf(snapshot, sessionId);
			const scopeId = role?.coordinatorId ?? pickCoordinator(state, snapshot.selected)?.id;
			const coordinator = coordinatorById(state, scopeId);
			const isCoordinator = role?.role === "coordinator";
			const threads = scopeId === void 0 ? [] : sortThreads(threadsOf(state, scopeId));
			const title = coordinator === void 0 ? t(loading ? "loading" : "pane.noCoordinator") : nameOf(coordinator);
			const archived = coordinator?.archived === true;
			const groups = /* @__PURE__ */ new Map();
			for (const thread of threads) {
				const group = groupOf(thread);
				groups.set(group, [...groups.get(group) ?? [], thread]);
			}
			const run = (action, failure) => {
				setNotice(void 0);
				action().catch((error) => {
					setNotice(failure(error instanceof Error ? error.message : String(error)));
				});
			};
			const open = (thread) => {
				if (thread.sessionId === sessionId) return;
				if (thread.sessionId === "" && thread.coordinatorId === "") {
					setNotice(t("orphans.noSession", { title: thread.title || thread.id }));
					return;
				}
				run(() => openThread(thread), (reason) => t("error.openThread", {
					title: thread.title,
					reason
				}));
			};
			const copy = dshCopy(dshApproval, t);
			const handlers = {
				confirmFolder: async (id, decision) => {
					await confirmFolder(id, decision);
					refresh();
				},
				resumeThread: async (id) => {
					await resumeThread(id);
					refresh();
				}
			};
			const actionError = (thread, reason) => {
				setNotice(t("error.action", {
					title: thread.title,
					reason
				}));
			};
			let body;
			if (loading) body = state === void 0 && snapshot.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dco-pane-note",
				role: "alert",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("error.unreachable") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "sm",
					onClick: refresh,
					children: t("error.retry")
				})]
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: "dco-plist",
				"aria-busy": "true",
				"aria-label": t("threads.loading"),
				children: [
					0,
					1,
					2
				].map((i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: "dco-pskeleton",
					"aria-hidden": "true",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dco-skeleton-bar" })]
				}, i))
			});
			else if (threads.length === 0) body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dco-pane-note",
				"data-testid": "dco-pane-empty",
				children: t("pane.empty")
			});
			else body = GROUPS.map((group) => {
				const rows = groups.get(group);
				if (rows === void 0) return null;
				const collapsible = group === "finished";
				const expanded = !collapsible || finishedOpen;
				const label = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`group.${group}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dco-pgroup-count",
					"data-attention": group === "attention" || void 0,
					children: rows.length
				})] });
				const listId = `dco-pane-${sessionId}-${group}`;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dco-pgroup",
					"data-testid": `dco-pane-group-${group}`,
					children: [collapsible ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dco-pgroup-head dco-pgroup-toggle",
						"data-pane-item": true,
						"aria-expanded": expanded,
						"aria-controls": listId,
						onClick: () => {
							const next = !finishedOpen;
							setFinishedOpen(next);
							write(FINISHED_KEY, next ? "open" : null);
						},
						children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dco-pgroup-chevron",
							"data-expanded": expanded || void 0,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevron, { size: 12 })
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "dco-pgroup-head",
						children: label
					}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "dco-plist",
						id: listId,
						"aria-label": t(`group.${group}`),
						children: rows.map((thread) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneRow, {
							thread,
							current: thread.sessionId === sessionId && sessionId !== "",
							now,
							t,
							onOpen: open,
							copy,
							handlers,
							onError: actionError
						}, thread.id))
					})]
				}, group);
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: "dco-pane",
				"data-testid": "dco-pane",
				"data-coordinator-id": scopeId,
				"aria-label": t("pane.label", { title }),
				onKeyDown: onListKey,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-pane-top",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dco-prow dco-pane-coord",
							"data-pane-item": true,
							"data-testid": "dco-pane-coordinator",
							"data-archived": archived || void 0,
							"aria-current": isCoordinator ? "page" : void 0,
							"aria-label": coordinator === void 0 ? title : archived ? t("pane.archivedAria", { title }) : t("pane.coordinatorAria", { title }),
							disabled: coordinator === void 0,
							onClick: () => {
								if (isCoordinator || coordinator === void 0) return;
								if (archived) {
									goHome(coordinator.id);
									return;
								}
								run(() => openCoordinator(coordinator.id), (reason) => t("error.open", { reason }));
							},
							children: [
								coordinator === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-glyph",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCoordinator, { size: 16 })
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Monogram, {
									name: title,
									size: "xs",
									muted: archived
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-prow-title",
									children: title
								}),
								archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dco-tag",
									children: t("coordinator.tag.archived")
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
							label: t("pane.overview"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dco-icon-btn",
								"data-pane-item": true,
								"data-testid": "dco-pane-overview",
								"aria-label": t("pane.overview"),
								onClick: () => {
									goHome(coordinator?.id);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconOverview, { size: 16 })
							})
						})]
					}),
					coordinator !== void 0 && !loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderLine, {
						coordinator,
						t,
						pickFolder,
						compact: true,
						setFolder: async (id, path) => {
							await setCoordinatorFolder(id, path);
							refresh();
						}
					}, coordinator.id),
					notice !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-pane-note",
						role: "alert",
						"data-tone": "danger",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconWarning, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: notice })]
					}),
					snapshot.error !== void 0 && state !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dco-pane-note",
						role: "alert",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							t("error.unreachable"),
							" ",
							t("error.stale")
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: refresh,
							children: t("error.retry")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dco-pane-groups",
						children: body
					})
				]
			});
		}
		/**
		* Register the pane when dsh's right Sidebar is loaded. Returns the header button's action: toggle the pane while
		* the Sidebar is there, else open the Coordinator page.
		*/
		function mountThreadsPane(ctx, deps) {
			let controller;
			ctx.inject([
				"sidebarRight",
				"sidebarRightTabs",
				"slots"
			], (child) => {
				const sidebar = child.get("sidebarRight");
				const tabs = child.get("sidebarRightTabs");
				child.effect(() => {
					const pane = createPaneController(sidebar, deps.store);
					controller = pane;
					return () => {
						if (controller === pane) controller = void 0;
						pane.dispose();
					};
				}, "dsh-coordinator: threads pane controller");
				child.effect(() => tabs.register({
					id: PANE_ID,
					kind: PANE_KIND,
					title: () => deps.t("pane.title")
				}), "dsh-coordinator: threads pane type");
				const actions = {
					openThread: async (thread) => {
						controller?.leaveFullscreen();
						await openThreadSession(deps.openSession, thread, thread.coordinatorId === "" ? void 0 : () => deps.openCoordinator(thread.coordinatorId));
					},
					confirmFolder: deps.confirmFolder,
					resumeThread: deps.resumeThread,
					openCoordinator: async (coordinatorId) => {
						controller?.leaveFullscreen();
						await deps.openCoordinator(coordinatorId);
					},
					goHome: (coordinatorId) => {
						controller?.leaveFullscreen();
						if (coordinatorId !== void 0) deps.store.select(coordinatorId);
						deps.goHome();
					},
					pickFolder: deps.pickFolder,
					setCoordinatorFolder: deps.setCoordinatorFolder,
					holdFast: () => deps.store.holdFast(),
					refresh: () => {
						deps.store.refresh();
					},
					hidden: (sessionId) => {
						controller?.hidden(sessionId);
					}
				};
				child.slots.inject("sidebar.right.pane.tab", () => child.slots.register({
					name: "sidebar.right.pane.tab",
					key: PANE_ID,
					locale: NS,
					inject: () => ({
						hooks: deps.hooks,
						...actions,
						dshApproval: deps.dshApproval()
					})
				}, ThreadsPane));
				child.slots.inject("sidebar.right.pane.tab.title", () => child.slots.register({
					name: "sidebar.right.pane.tab.title",
					key: PANE_ID,
					locale: NS,
					inject: () => ({ hidden: actions.hidden })
				}, PaneTitle));
			});
			return () => {
				if (controller !== void 0) controller.toggle();
				else deps.goHome();
			};
		}
		// src/client/styles.ts
		/**
		* Plugin styles. dsh's plugin guidance: style only with the host's `--dsw-*` theme tokens, copy the markup and CSS
		* of host primitives under the plugin's own prefix instead of importing Harness client packages, and take spacing,
		* type and row patterns from a host page of the same kind. Sources (dsh 0.2.2, MIT):
		*   page, heading, rows, empty state, notice  ui-schedule TaskManagerPage.module.css (Automation tasks page)
		*   heading intro                             ui-plugin-manager PluginManagerPage.module.css (Plugins page)
		*   button, state dot, tooltip bubble, pill   ui-primitives Button / StateDot / Tooltip / Pill .module.css
		*   header icon button                        ui-schedule ScheduleCatalogAction.module.css
		*   message origin line                       experimental liveshare user-origin.module.css
		*   sidebar row icon, hover card section      experimental forge SessionList.module.css, ui-schedule SessionScheduleMark
		*   text field                                ui-primitives Input .module.css (28px, radius-sm, hairline border)
		*   settings rows (folder, executor prompt)   settings dialog PreferenceRow (title 14, description 12 tertiary, hairlines)
		*   coordinator monogram tile                 Plugins page icon tiles (radius, hairline), toned with dsh palette tokens
		*   empty-state picture                       Automation tasks empty state, painted with --dsw-alias-illustration-*
		* Motion uses dsh's --ds-ease-in-out and --ds-transition-duration-fast; every animation stops under reduced motion.
		* Hover feedback is enabled only under `(hover: hover)`; focus rings come from dsh's global `:focus-visible` rule.
		* Feature CSS keeps font weight at or below 500.
		*
		* Inlined as a string because the client bundle has no CSS pipeline; `apply` mounts it as one <style> element and
		* removes it on unload.
		*/
		const STYLE_ID = "dsh-coordinator-styles";
		const CSS = `
.dco-page { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font-size: 14px; line-height: 1.6; }
.dco-scroll { container-type: inline-size; flex: 1; min-width: 0; min-height: 0; overflow: auto; scrollbar-gutter: stable; --dsh-scrollbar-width: 9px; --dsh-scrollbar-thumb-border: 2px; }
.dco-content { max-width: 960px; margin: 0 auto; padding: 0 clamp(24px, 4vw, 48px) 48px; }
@media (max-width: 767px) { .dco-content { padding-inline: 20px; } }

/* Page head: title and intro left, actions right, the permission control on its own row below. */
.dco-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 16px; padding-top: 28px; margin-bottom: 24px; }
[data-platform='darwin'] .dco-head { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
.dco-heading { flex: 1 1 280px; min-width: 0; max-width: 100%; }
.dco-heading h1 { margin: 0; font-size: 20px; line-height: 28px; font-weight: 500; }
.dco-heading h1:focus { outline: none; }
.dco-intro { margin: 4px 0 0; max-width: 640px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-head-perm { flex: 1 0 100%; min-width: 0; }
.dco-head-perm .dco-perm { margin-top: 0; }
.dco-actions { display: flex; flex: none; align-items: center; gap: 8px; white-space: nowrap; }
.dco-summary { display: flex; flex-wrap: wrap; gap: 2px 14px; margin: 6px 0 0; min-height: 20px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dco-stat { display: inline-flex; align-items: center; gap: 6px; }
.dco-stat::before { content: ''; flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-label-caption); }
.dco-stat[data-tone='warning'] { color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-stat[data-tone='warning']::before { background: var(--dsw-alias-state-warn-primary); }
.dco-stat[data-tone='running']::before { box-sizing: border-box; background: transparent; box-shadow: inset 0 0 0 1.5px var(--dsw-alias-label-tertiary); }
.dco-summary-attn { color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-meta + .dco-meta::before { content: ' · '; padding: 0 2px; color: var(--dsw-alias-label-caption); }
.dco-dev-note { margin: -8px 0 16px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }

.dco-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: none; border-radius: var(--dsw-radius-md); cursor: pointer; font: inherit; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); background: transparent; padding: 0 14px; height: 36px; white-space: nowrap; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-btn:disabled { cursor: not-allowed; opacity: 0.4; }
.dco-btn[aria-busy='true'] { cursor: progress; }
.dco-btn-sm { height: 28px; font-size: 12px; line-height: 18px; padding: 0 10px; border-radius: var(--dsw-radius-sm); }
.dco-btn-head { height: 32px; font-size: 13px; line-height: 20px; padding: 0 12px; border-radius: 16px; }
.dco-btn-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
.dco-btn-outline { border: 0.5px solid transparent; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsh-button-outline-color, var(--dsw-alias-border-l3)); }
.dco-btn-ghost:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }
.dco-btn-icon { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; flex: none; }
.dco-quiet-btn { color: var(--dsw-alias-label-secondary); }
.dco-head .dco-quiet-btn { height: 32px; font-size: 13px; border-radius: 16px; }
@media (hover: hover) {
  .dco-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
  .dco-btn-ghost:hover:not(:disabled), .dco-btn-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
  .dco-quiet-btn:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
}

/* Notices: a quiet fill, a toned icon, the text in two inks. */
.dco-notice { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 9px; margin: 0 0 16px; padding: 12px 14px; border-radius: var(--dsw-radius-md); background: var(--dsw-specific-sidebar-fill); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 20px; overflow-wrap: anywhere; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-notice-icon { flex: none; display: inline-flex; height: 20px; align-items: center; color: var(--dsw-alias-label-tertiary); }
.dco-notice[data-tone='warning'] .dco-notice-icon { color: var(--dsw-alias-state-warn-primary); }
.dco-notice[data-tone='danger'] .dco-notice-icon { color: var(--dsw-alias-state-error-primary); }
.dco-notice-text { flex: 1 1 12em; min-width: 0; margin: 0; }
.dco-notice-text strong { font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-notice-detail { display: block; color: var(--dsw-alias-label-tertiary); }
.dco-notice-actions { display: flex; gap: 8px; margin-left: auto; align-self: center; }
@keyframes dco-rise { from { opacity: 0; transform: translateY(-2px); } }

/* Executor rows (page): glyph, title and time, status and detail, folder. */
.dco-list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.dco-item { position: relative; }
.dco-row { display: flex; align-items: flex-start; gap: 12px; width: 100%; box-sizing: border-box; padding: 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; text-align: left; white-space: normal; cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-row:focus-visible { outline-offset: -2px; }
.dco-row:active { background: var(--dsw-alias-interactive-bg-active); }
.dco-item[data-archivable] .dco-row { padding-right: 44px; }
/* With a mouse the archive button takes the time's place on hover, so every row keeps its time in one column. */
@media (hover: hover) {
  .dco-item[data-archivable] .dco-row { padding-right: 8px; }
  .dco-item[data-archivable]:hover .dco-row-time, .dco-item[data-archivable]:focus-within .dco-row-time { visibility: hidden; }
}
@media (hover: hover) { .dco-row:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dco-glyph { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 22px; color: var(--dsw-alias-label-tertiary); }
.dco-row-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.dco-row-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dco-row-title { flex: 0 1 auto; min-width: 0; overflow: hidden; font-weight: 500; line-height: 22px; text-overflow: ellipsis; white-space: nowrap; }
.dco-row .dco-row-title { flex: 1 1 auto; }
.dco-row-time { flex: none; margin-left: auto; font-size: 12px; line-height: 22px; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; white-space: nowrap; }
.dco-row-summary { display: -webkit-box; margin-top: 1px; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.dco-status[data-attention] { color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-status[data-tone='danger'] { color: var(--dsw-alias-state-error-primary); }
.dco-row-path { display: block; overflow: hidden; color: var(--dsw-alias-label-caption); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
.dco-row-path > bdi { direction: ltr; unicode-bidi: isolate; }
.dco-item[data-finished] .dco-row-title { color: var(--dsw-alias-label-tertiary); }
.dco-item[data-finished] .dco-row-summary { color: var(--dsw-alias-label-caption); }
@media (hover: hover) {
  .dco-item[data-finished]:hover .dco-row-title { color: inherit; }
  .dco-item[data-finished]:hover .dco-row-summary { color: var(--dsw-alias-label-tertiary); }
}
.dco-item[data-finished] .dco-row:focus-visible .dco-row-title { color: inherit; }

.dco-icon-btn { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 28px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out), color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-icon-btn-sm { width: 24px; height: 24px; border-radius: var(--dsw-radius-sm); }
.dco-icon-btn:focus-visible { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); }
.dco-icon-btn:disabled { cursor: progress; opacity: 0.4; }
@media (hover: hover) { .dco-icon-btn:hover:not(:disabled) { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); } }
.dco-archive { position: absolute; top: 5px; right: 4px; }
.dco-row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: -2px 0 6px; padding: 0 8px 0 36px; }
.dco-row-actions[data-compact] { margin: -2px 0 6px; padding: 0 8px 0 30px; }
.dco-row-actions-note { flex: 1 1 18em; min-width: 0; margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
.dco-row-actions-path { color: var(--dsw-alias-label-secondary); font-family: var(--ds-font-family-code, ui-monospace, monospace); }
.dco-row-actions-buttons { display: inline-flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.dco-row-actions[data-compact] .dco-row-actions-buttons { margin-left: 0; }
@media (hover: hover) {
  .dco-item .dco-archive { opacity: 0; }
  .dco-item:hover .dco-archive, .dco-item:focus-within .dco-archive, .dco-archive:disabled { opacity: 1; }
}

/* Page sections (Without coordinator, Allowed folders) and the executor list heading. */
.dco-section { margin-top: 32px; }
.dco-section-title { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-section-desc { margin: 2px 0 8px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-section-count { font-size: 13px; line-height: 22px; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dco-allowed-list { margin: 0; padding: 0; list-style: none; }
.dco-allowed-item { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 0 0 8px; border-radius: var(--dsw-radius-sm); }
.dco-allowed-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.dco-allowed-path > bdi { direction: ltr; unicode-bidi: isolate; }
.dco-threads-head { display: flex; align-items: baseline; gap: 8px; margin: 0 0 2px; padding: 0 8px; }
.dco-tgroup { margin-top: 4px; }
.dco-tgroup-toggle { box-sizing: border-box; width: 100%; height: 28px; margin-top: 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.dco-tgroup-toggle:focus-visible { outline-offset: -2px; }
@media (hover: hover) { .dco-tgroup-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); } }
.dco-archived-note { margin: 2px 8px 4px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }
.dco-row-static { cursor: default; }
@media (hover: hover) { .dco-row-static:hover { background: transparent; } .dco-item[data-archived-row]:hover .dco-row-title { color: var(--dsw-alias-label-tertiary); } }
.dco-confirm-quiet { color: var(--dsw-alias-label-tertiary); }
.dco-tgroup-head { display: flex; align-items: center; gap: 6px; margin: 8px 0 2px; padding: 0 8px; font-size: 12px; line-height: 18px; font-weight: 400; color: var(--dsw-alias-label-tertiary); }

.dco-dot { position: relative; display: inline-block; flex: none; width: 10px; height: 10px; }
.dco-dot::after { content: ''; position: absolute; inset: 20%; border-radius: 50%; background: currentColor; }
.dco-dot[data-state='done'] { color: var(--dsw-alias-state-success-primary); }
.dco-dot[data-state='warning'] { color: var(--dsw-alias-state-warn-primary); }
.dco-dot[data-state='error'] { color: var(--dsw-alias-state-error-primary); }
.dco-dot[data-state='idle'] { color: var(--dsw-alias-state-idle-primary); }
.dco-spinner { flex: none; color: var(--dsw-alias-label-tertiary); }
.dco-spinner-motion { transform-origin: center; animation: dco-spin 1.5s linear infinite; }
.dco-spinner-track, .dco-spinner-arc { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.dco-spinner-track { opacity: 0.25; }
.dco-spinner-arc { stroke-dasharray: 12 150; animation: dco-dash 1.5s ease-in-out infinite; }
@keyframes dco-spin { to { transform: rotate(360deg); } }
@keyframes dco-dash { 0% { stroke-dasharray: 12 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 24 150; stroke-dashoffset: -6; } 100% { stroke-dasharray: 12 150; stroke-dashoffset: 0; } }

/* Empty states: dsh's empty-state art, a quiet title, one line of help, one action. */
.dco-empty { display: flex; align-items: center; flex-direction: column; padding: 48px 20px; text-align: center; color: var(--dsw-alias-label-tertiary); font-size: 14px; }
.dco-empty p { margin: 0; max-width: 420px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-caption); }
.dco-empty .dco-empty-title { margin-bottom: 4px; color: var(--dsw-alias-label-tertiary); font-size: 14px; line-height: 22px; }
.dco-empty-page { padding: 40px 20px 32px; }
.dco-empty-page .dco-art { margin-bottom: 16px; }
.dco-empty-actions { display: flex; gap: 8px; margin-top: 20px; }
.dco-empty-inline { padding: 28px 16px 32px; }
.dco-art-bg { fill: var(--dsw-alias-illustration-background); }
.dco-art-backing { fill: var(--dsw-alias-illustration-backing); }
.dco-art-surface { fill: var(--dsw-alias-illustration-surface); stroke: var(--dsw-alias-illustration-backing); stroke-width: 1; }
.dco-art-detail { fill: var(--dsw-alias-illustration-detail); }
.dco-art-shadow { fill: var(--dsw-alias-illustration-shadow); }
.dco-art-badge { fill: var(--dsw-alias-bg-base); stroke: var(--dsw-alias-illustration-detail); stroke-width: 1.5; }
.dco-art-node { fill: var(--dsw-alias-illustration-detail); }
.dco-art-line { stroke: var(--dsw-alias-illustration-detail); stroke-width: 1.5; stroke-linecap: round; fill: none; }

/* Loading placeholders. */
.dco-skeleton { display: flex; gap: 12px; padding: 8px; }
.dco-skeleton-lines { display: flex; flex: 1; flex-direction: column; gap: 6px; padding-top: 5px; }
.dco-skeleton-bar, .dco-skeleton-mono, .dco-skeleton-card { background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-module-platform)); animation: dco-pulse 1.4s ease-in-out infinite; }
.dco-skeleton-bar { height: 12px; border-radius: 6px; }
.dco-skeleton-bar:nth-child(1) { width: 40%; height: 14px; }
.dco-skeleton-bar:nth-child(2) { width: 75%; }
.dco-skeleton-bar:nth-child(3) { width: 30%; height: 10px; }
.dco-skeleton-dot { flex: none; width: 16px; height: 22px; }
.dco-skeleton-mono { flex: none; width: 28px; height: 28px; border-radius: var(--dsw-radius-sm); }
.dco-skeleton-mono-lg { width: 40px; height: 40px; border-radius: var(--dsw-radius-md); }
.dco-skeleton-crow { align-items: center; padding: 10px; }
.dco-skeleton-crow .dco-skeleton-lines { padding-top: 0; }
.dco-skeleton-crow .dco-skeleton-bar:nth-child(1) { width: 55%; }
.dco-skeleton-crow .dco-skeleton-bar:nth-child(2) { width: 40%; }
.dco-skeleton-head { align-items: center; padding: 0 0 16px; }
.dco-skeleton-head .dco-skeleton-lines { padding-top: 0; }
.dco-skeleton-head .dco-skeleton-bar:nth-child(1) { width: 30%; height: 16px; }
.dco-skeleton-head .dco-skeleton-bar:nth-child(2) { width: 45%; }
.dco-skeleton-card { height: 128px; margin: 0 0 24px; border-radius: var(--dsw-radius-md); opacity: 0.6; }
.dco-loading-note { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@keyframes dco-pulse { 50% { opacity: 0.45; } }

.dco-tooltip { position: fixed; z-index: 1100; display: inline-flex; align-items: center; box-sizing: border-box; width: max-content; max-width: min(50vw, calc(100vw - 24px)); padding: 3px 7px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-tooltip-bg); color: var(--dsw-alias-tooltip-label, var(--dsw-static-neutral-bluish-00)); font-size: 13px; line-height: 20px; white-space: pre-line; overflow-wrap: break-word; pointer-events: none; transform: translateX(-50%); animation: dco-fade 150ms var(--ds-ease-in-out, ease-in-out); }
.dco-tooltip[data-align='end'] { transform: translateX(-100%); }
@keyframes dco-fade { from { opacity: 0; } }

.dco-panel-icon { position: relative; display: inline-flex; }
.dco-badge { position: absolute; top: -5px; right: -7px; min-width: 14px; height: 14px; box-sizing: border-box; padding: 0 3px; border-radius: 7px; font-size: 9px; line-height: 14px; font-weight: 500; text-align: center; font-variant-numeric: tabular-nums; background: var(--dsw-alias-state-warn-primary); color: var(--dsw-static-neutral-bluish-00); box-shadow: 0 0 0 1.5px var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base)); }

.dco-header { position: relative; }
.dco-header-dot { position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-warn-primary); box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-base); pointer-events: none; }

.dco-origin { align-self: flex-end; display: inline-flex; align-items: center; gap: 4px; max-width: 100%; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: var(--dsh-content-font-size-secondary, 13px); line-height: calc(18px + var(--dsh-content-font-delta-secondary, 0px)); white-space: nowrap; }
.dco-origin > span { overflow: hidden; text-overflow: ellipsis; }
.dco-origin svg { flex: none; }

.dco-welcome { display: flex; flex-direction: column; gap: 8px; padding: 4px 0 8px; }
.dco-welcome-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-welcome-title svg { color: var(--dsw-alias-label-secondary); }
.dco-welcome p { margin: 0; font-size: var(--dsh-content-font-size, 14px); line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.dco-welcome-label { margin-top: 4px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-welcome-examples { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.dco-pill { display: inline-flex; align-items: center; max-width: 100%; min-height: 28px; box-sizing: border-box; padding: 4px 10px; border: none; border-radius: var(--dsw-radius-sm); font: inherit; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); background: transparent; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); text-align: left; cursor: pointer; }
@media (hover: hover) { .dco-pill:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.dco-welcome-hint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }
.dco-welcome .dco-perm-note { margin: 4px 0 0; }
.dco-empty .dco-perm-note { max-width: 460px; margin: 28px 0 0; text-align: left; }
.dco-perm { margin-top: 10px; }
.dco-perm-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.dco-perm-label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-perm-label svg { color: var(--dsw-alias-label-tertiary); }
.dco-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--dsw-radius-md); background: var(--dsw-specific-sidebar-fill); }
.dco-seg-option { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 10px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 13px; line-height: 20px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-seg-option[aria-checked='true'] { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); }
.dco-seg-option:disabled { cursor: default; color: var(--dsw-alias-label-dimmed, var(--dsw-alias-label-caption)); }
.dco-seg-option:focus-visible { box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline: none; }
@media (hover: hover) { .dco-seg-option:hover:not(:disabled):not([aria-checked='true']) { color: var(--dsw-alias-label-secondary); } }
.dco-seg-badge { color: var(--dsw-alias-label-tertiary); font-size: 8px; line-height: 10px; font-weight: 500; letter-spacing: 0.2px; }
.dco-perm-desc { max-width: 640px; margin: 6px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-perm-confirm { margin: 10px 0 0; max-width: 640px; }
.dco-perm-ack { display: flex; align-items: flex-start; gap: 6px; margin-top: 6px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dco-perm-ack input { margin: 4px 0 0; }
.dco-perm-error { margin: 6px 0 0; font-size: 12px; color: var(--dsw-alias-state-error-primary); }

@container (max-width: 520px) {
  .dco-head > .dco-actions { width: 100%; flex-wrap: wrap; }
  .dco-row .dco-row-title { display: -webkit-box; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
}

/* Coordinator identity: a monogram tile toned from the name (dsh palette tokens only). */
.dco-mono { --dco-tone: var(--dsw-static-blue-500); display: inline-flex; flex: none; align-items: center; justify-content: center; box-sizing: border-box; width: 28px; height: 28px; border-radius: var(--dsw-radius-sm); background: color-mix(in srgb, var(--dco-tone) 12%, transparent); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) color-mix(in srgb, var(--dco-tone) 26%, transparent); color: color-mix(in srgb, var(--dco-tone) 76%, var(--dsw-alias-label-primary)); font-size: 13px; line-height: 1; font-weight: 500; user-select: none; }
.dco-mono[data-tone='blue'] { --dco-tone: var(--dsw-static-blue-500); }
.dco-mono[data-tone='violet'] { --dco-tone: var(--dsw-alias-chart-tools); }
.dco-mono[data-tone='green'] { --dco-tone: var(--dsw-static-green-500); }
.dco-mono[data-tone='slate'] { --dco-tone: var(--dsw-static-neutral-bluish-600); }
.dco-mono[data-tone='muted'] { --dco-tone: var(--dsw-alias-label-caption); color: var(--dsw-alias-label-tertiary); }
.dco-mono[data-size='xs'] { width: 18px; height: 18px; border-radius: 5px; font-size: 10px; }
.dco-mono[data-size='md'] { width: 32px; height: 32px; font-size: 14px; }
.dco-mono[data-size='lg'] { width: 40px; height: 40px; border-radius: var(--dsw-radius-md); font-size: 17px; }
.dco-tag { flex: none; padding: 0 6px; border-radius: var(--dsw-radius-xs); background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 18px; font-weight: 400; white-space: nowrap; }

/* Threads side pane (a right-Sidebar tab). Row geometry follows the left sidebar's session rows (radius-md, hover
   fill, selected = hover fill); group headers follow its section labels. */
.dco-pane { box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; height: 100%; min-width: 0; min-height: 0; overflow: auto; padding: 8px 8px 16px; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; scrollbar-gutter: stable; --dsh-scrollbar-width: 9px; --dsh-scrollbar-thumb-border: 2px; }
.dco-pane-top { display: flex; align-items: center; gap: 4px; }
.dco-pane-top .dco-pane-coord { flex: 1; min-width: 0; }
.dco-pane-title-icon { flex: none; }
.dco-pane-groups { display: flex; flex-direction: column; gap: 8px; }
.dco-pgroup { display: flex; flex-direction: column; }
.dco-pgroup-head { display: flex; align-items: center; gap: 6px; box-sizing: border-box; width: 100%; height: 28px; margin: 0; padding: 0 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 12px; line-height: 18px; font-weight: 400; text-align: left; }
.dco-pgroup-toggle { cursor: pointer; }
.dco-pgroup-toggle:focus-visible { outline-offset: -2px; }
@media (hover: hover) { .dco-pgroup-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); } }
.dco-pgroup-count { color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dco-pgroup-count[data-attention] { color: var(--dsw-alias-state-warn-primary); }
.dco-pgroup-chevron { display: inline-flex; margin-left: auto; transform: rotate(-90deg); transition: transform 150ms var(--ds-ease-in-out, ease-in-out); }
.dco-pgroup-chevron[data-expanded] { transform: none; }
.dco-plist { display: flex; flex-direction: column; gap: 1px; margin: 0; padding: 0; list-style: none; }
.dco-prow { display: flex; align-items: flex-start; gap: 8px; box-sizing: border-box; width: 100%; min-height: 32px; padding: 6px 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-prow:focus-visible { outline-offset: -2px; }
.dco-prow:active { background: var(--dsw-alias-interactive-bg-active); }
.dco-prow[aria-current] { background: var(--dsw-alias-interactive-bg-hover); cursor: default; }
@media (hover: hover) { .dco-prow:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dco-prow .dco-glyph { height: 20px; }
.dco-pane-coord { align-items: center; min-height: 36px; }
.dco-pane-coord .dco-glyph { color: var(--dsw-alias-label-secondary); }
.dco-pane-coord .dco-prow-title { font-weight: 500; }
.dco-pane-coord[data-archived] .dco-prow-title { color: var(--dsw-alias-label-tertiary); }
.dco-prow-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.dco-prow-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.dco-prow-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dco-prow .dco-row-time { line-height: 20px; }
.dco-prow-status { display: block; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.dco-pitem[data-finished] .dco-prow-title { color: var(--dsw-alias-label-tertiary); }
@media (hover: hover) { .dco-pitem[data-finished]:hover .dco-prow-title { color: inherit; } }
.dco-pane-note { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 4px 0; padding: 0 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dco-pane-note[data-tone='danger'] svg { flex: none; color: var(--dsw-alias-state-error-primary); }
.dco-pskeleton { display: flex; flex-direction: column; gap: 6px; padding: 8px 8px 8px 32px; }
.dco-pskeleton .dco-skeleton-bar:nth-child(1) { width: 60%; height: 12px; }
.dco-pskeleton .dco-skeleton-bar:nth-child(2) { width: 40%; height: 10px; }

/* Coordinators: list and the selected coordinator's detail; two columns from 900px of page width, stacked below. */
.dco-coords { display: flex; flex-direction: column; gap: 20px; }
@container (min-width: 900px) {
  .dco-coords { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 32px; align-items: start; }
  .dco-coords > .dco-clist { position: sticky; top: 16px; }
}
.dco-clist { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.dco-crow { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; box-sizing: border-box; padding: 8px 10px 8px 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-crow:focus-visible { outline-offset: -2px; }
.dco-crow:active { background: var(--dsw-alias-interactive-bg-active); }
.dco-crow[aria-current='true'] { background: var(--dsw-alias-interactive-bg-hover); }
@media (hover: hover) { .dco-crow:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dco-crow .dco-row-title { line-height: 20px; }
.dco-crow-meta { display: block; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.dco-crow-flag { display: inline-flex; flex: none; color: var(--dsw-alias-state-warn-primary); }
.dco-citem[data-archived] .dco-row-title { color: var(--dsw-alias-label-tertiary); }
.dco-detail { min-width: 0; }
.dco-detail-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 16px; }
.dco-detail-id { display: flex; flex: 1 1 14em; flex-direction: column; min-width: 0; }
.dco-name-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dco-detail-title { flex: 0 1 auto; min-width: 0; margin: 0; overflow: hidden; font-size: 16px; line-height: 24px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.dco-detail[data-archived] .dco-detail-title { color: var(--dsw-alias-label-secondary); }
.dco-detail-sub { margin: 0; overflow: hidden; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); text-overflow: ellipsis; white-space: nowrap; }
.dco-detail-actions { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; }
.dco-rename-btn { width: 24px; height: 24px; color: var(--dsw-alias-label-caption); }
.dco-rename { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dco-input.dco-rename-input { flex: none; width: min(100%, 320px); height: 30px; font-size: 15px; font-weight: 500; }
.dco-rename ~ .dco-detail-sub { display: none; }
.dco-rename-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-rename-hint[data-tone='danger'] { color: var(--dsw-alias-state-error-primary); }
.dco-detail .dco-notice { margin-bottom: 12px; }

/* The detail's settings: rows in a hairline card, as dsh's settings rows (title, description, control). */
.dco-settings { margin: 0 0 24px; border-radius: var(--dsw-radius-md); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); }
.dco-settings > * + * { border-top: var(--dsh-hairline-width, 0.5px) solid var(--dsw-alias-border-l2); }
.dco-setting { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; }
.dco-setting-icon { flex: none; display: inline-flex; align-items: center; height: 22px; color: var(--dsw-alias-label-tertiary); }
.dco-setting-main { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.dco-setting-title { font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-setting-desc { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-folder-value { display: flex; min-width: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-folder-actions { display: inline-flex; flex: none; align-items: center; gap: 4px; }
.dco-setting > .dco-folder-actions { margin-top: -3px; }
.dco-folder:not([data-compact]) > .dco-pickwait, .dco-folder:not([data-compact]) > .dco-path, .dco-folder:not([data-compact]) > .dco-field-error { margin: -4px 16px 14px 44px; }
.dco-input.dco-textarea { flex: none; display: block; width: 100%; height: auto; min-height: 80px; max-height: 280px; field-sizing: content; margin-top: 10px; padding: 8px 10px; resize: vertical; font-size: 13px; line-height: 20px; white-space: pre-wrap; }
.dco-prompt-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: 8px; }
.dco-prompt-count { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dco-prompt-count[data-tone='danger'] { color: var(--dsw-alias-state-error-primary); }
.dco-prompt-state { font-size: 12px; line-height: 18px; }
.dco-saved { display: inline-flex; align-items: center; gap: 4px; color: var(--dsw-alias-state-success-primary); animation: dco-fade var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-unsaved { color: var(--dsw-alias-label-tertiary); }
.dco-prompt-buttons { display: inline-flex; gap: 8px; margin-left: auto; }

/* Archive confirmation: a hairline card with the Executor Sessions it stops. */
.dco-confirm { margin: 0 0 16px; padding: 14px 16px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-base); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l4, var(--dsw-alias-border-l3)); font-size: 13px; line-height: 20px; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-confirm-title { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-confirm-body { margin: 2px 0 0; color: var(--dsw-alias-label-secondary); }
.dco-confirm-working { margin-top: 10px; }
.dco-confirm-list { display: flex; flex-direction: column; gap: 2px; margin: 6px 0 0; padding: 4px 0; list-style: none; border-radius: var(--dsw-radius-sm); background: var(--dsw-specific-sidebar-fill); }
.dco-confirm-list li { display: flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 10px; }
.dco-confirm-list .dco-glyph { height: 20px; }
.dco-confirm-item { flex: 1; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-primary); text-overflow: ellipsis; white-space: nowrap; }
.dco-confirm-status { flex: none; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dco-confirm-refused { margin: 10px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
.dco-confirm-refused strong { font-weight: 500; color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-check { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dco-check input { flex: none; margin: 3px 0 0; accent-color: var(--dsw-alias-button-primary-fill); }
.dco-check-note { display: block; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }

/* Folder choice: the side pane's folder line, the wait line of a pending pick, and the inline path field. */
.dco-folder-line { display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 28px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-folder-icon { flex: none; display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.dco-folder-path { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
.dco-folder-path > bdi { direction: ltr; unicode-bidi: isolate; }
.dco-folder-change { flex: none; }
.dco-folder[data-compact] { margin: 0; padding: 0 0 0 8px; }
.dco-folder[data-compact] .dco-folder-line { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-folder[data-compact] .dco-folder-actions { gap: 0; margin-left: auto; }
.dco-folder[data-compact] .dco-folder-change { padding: 0 8px; }
.dco-folder[data-compact] .dco-path { margin: 4px 0 8px; }
.dco-pickwait { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 0 0 16px; padding: 4px 4px 4px 12px; border-radius: var(--dsw-radius-md); background: var(--dsw-specific-sidebar-fill); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-pickwait-icon { display: inline-flex; flex: none; }
.dco-pickwait-text { flex: 1 1 16em; min-width: 0; padding: 5px 0; }
.dco-pickwait-actions { display: inline-flex; flex: none; gap: 2px; margin-left: auto; }
.dco-pickwait[data-compact] { margin: 4px 0; padding-left: 8px; }
.dco-path { display: flex; flex-direction: column; gap: 4px; margin: 0 0 16px; max-width: 640px; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-path-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dco-path-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-path-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dco-path-buttons { display: inline-flex; gap: 8px; margin-left: auto; }
.dco-input { box-sizing: border-box; flex: 1 1 16em; min-width: 0; height: 28px; padding: 0 8px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); transition: box-shadow var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-input-mono { font-family: var(--ds-font-family-code, ui-monospace, monospace); font-size: 12px; }
.dco-input::placeholder { color: var(--dsw-alias-label-caption); }
.dco-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dco-input[aria-invalid='true'] { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-error-primary); }
.dco-input:disabled { opacity: 0.6; }
@media (hover: hover) { .dco-input:hover:not(:disabled):not(:focus-visible) { box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l4, var(--dsw-alias-border-l3)); } }
.dco-field-error { margin: 4px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); overflow-wrap: anywhere; }
.dco-folder[data-compact] .dco-field-error { padding-left: 0; }
.dco-prow:disabled { cursor: default; }
.dco-prow:disabled .dco-prow-title { color: var(--dsw-alias-label-tertiary); }

/* Left-sidebar coordinator row: icon + count in the row's 20px line, warning ink while one needs the user. */
.dco-decor { display: inline-flex; flex: none; align-items: center; gap: 2px; height: 20px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 20px; font-variant-numeric: tabular-nums; }
.dco-decor[data-tone='warning'] { color: var(--dsw-alias-state-warn-primary); }
/* Its hover card section; the card surface is dark in both themes, so the hover card's own label tokens apply. */
.dco-hover { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.dco-hover .dco-mono { color: color-mix(in srgb, var(--dco-tone) 55%, var(--dsw-alias-hovercard-label-primary, #fff)); background: color-mix(in srgb, var(--dco-tone) 30%, transparent); box-shadow: none; }
.dco-hover-body { display: flex; flex-direction: column; min-width: 0; }
.dco-hover-title { overflow: hidden; color: var(--dsw-alias-hovercard-label-primary, #fff); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.dco-hover-note { color: var(--dsw-alias-hovercard-label-tertiary, #adb2b8); font-size: 12px; line-height: 16px; }
.dco-hover-note [data-tone='warning'] { color: var(--dsw-static-orange-400, var(--dsw-alias-state-warn-secondary)); }
.dco-hover-sep { margin: 0 4px; }

@media (prefers-reduced-motion: reduce) {
  .dco-spinner-motion, .dco-spinner-arc, .dco-skeleton-bar, .dco-skeleton-mono, .dco-skeleton-card, .dco-tooltip, .dco-notice, .dco-confirm, .dco-pickwait, .dco-path, .dco-saved { animation: none; }
  .dco-pgroup-chevron, .dco-btn, .dco-row, .dco-crow, .dco-prow, .dco-icon-btn, .dco-input, .dco-seg-option { transition: none; }
  .dco-spinner-arc { stroke-dasharray: 18 150; stroke-dashoffset: -3; }
}

/* Settings on dsh's Plugins page (settings.tsx), laid out like dsh's own Subagent page. */
.dco-settings-section { min-width: 0; padding: 16px 0; }
.dco-settings-heading { margin: 0 0 12px; font-size: 13px; font-weight: 600; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.dco-settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px; }
.dco-settings-grid > * { min-width: 0; }
.dco-settings-grid input { min-width: 0; font-variant-numeric: tabular-nums; }
.dco-settings-cell { min-width: 0; }
.dco-settings-choice { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding-top: 12px; }
.dco-settings-choice-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 20px; }
.dco-settings-label { font-size: 13px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary); }
.dco-settings-reset { border: 0; padding: 0; background: none; font: inherit; font-size: 12px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dco-settings-reset:disabled { cursor: default; opacity: 0.5; }
.dco-settings-hint, .dco-settings-note { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-settings-note { padding-top: 4px; }
`;
		// src/client/index.tsx
		/** Same id for the sidebar entry and the main panel key: the sidebar opens the panel whose key matches. */
		const PANEL_ID = "dsh-coordinator";
		function optional(ctx, name) {
			try {
				return ctx.get(name);
			} catch {
				return;
			}
		}
		/**
		* Open a Session in the chat UI, refreshing the client Session catalog first when it does not list the
		* Session yet (the coordinator Session may have been created a moment ago). Pattern from
		* dsh-superagent-prototype src/navigation.ts (`openKnownSession`), MIT License, Copyright (c) 2026
		* DeepSeek Harness Team.
		*/
		async function openSession(ctx, sessionId) {
			const uiWorkspace = optional(ctx, "uiWorkspace");
			if (uiWorkspace === void 0) throw new Error("the workspace UI is not loaded");
			const sessions = optional(ctx, "sessions");
			if (sessions !== void 0) {
				const listed = () => {
					const s = sessions.list.getSnapshot();
					return s.phase === "ready" && s.byId[sessionId] !== void 0;
				};
				if (!listed()) await sessions.refresh();
				if (!listed()) throw new Error(`session ${sessionId} is not in the session list`);
			}
			uiWorkspace.openSession(sessionId);
		}
		/** Put text into a session's composer and focus it (the welcome's example asks). */
		function fillDraft(ctx, sessionId, text) {
			const scope = optional(ctx, "sessions")?.scope?.(sessionId);
			const conversation = scope === void 0 ? void 0 : optional(scope, "conversation");
			if (scope === void 0 || conversation === void 0) return;
			const input = conversation.input.for(scope);
			input.setDraft(text);
			input.focus();
		}
		/**
		* The native folder picker, as dsh's own native directory flow chooses it: the desktop bridge when present, else the
		* workspace UI's host picker. Anything that cannot pick (no picker, a refused or failed call) reads as `unavailable`,
		* and the UI falls back to a path field.
		*/
		async function pickFolder(ctx) {
			const desktop = globalThis.__DSH_DIRECTORY_PICKER__;
			const uiWorkspace = optional(ctx, "uiWorkspace");
			const pick = typeof desktop?.pick === "function" ? () => desktop.pick() : typeof uiWorkspace?.pickDirectory === "function" ? () => uiWorkspace.pickDirectory() : void 0;
			if (pick === void 0) return { kind: "unavailable" };
			try {
				const path = await pick();
				return typeof path === "string" && path !== "" ? {
					kind: "picked",
					path
				} : { kind: "cancelled" };
			} catch (error) {
				return {
					kind: "unavailable",
					reason: error instanceof Error ? error.message : String(error)
				};
			}
		}
		function mountStyles() {
			document.getElementById(STYLE_ID)?.remove();
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = CSS;
			document.head.append(style);
			return () => {
				style.remove();
			};
		}
		const inject = [
			"slots",
			"remote",
			"locale"
		];
		async function apply(ctx) {
			ctx.effect(mountStyles, "dsh-coordinator: styles");
			ctx.effect(() => ctx.locale.register(NS, {
				en,
				zh
			}), "dsh-coordinator: dictionaries");
			const t = ctx.locale.bind(NS);
			await ctx.remote.$mount(TYPERT_REMOTE);
			mountSettingsPage(ctx);
			ctx.inject(["remote.coordinator", "slots"], (child) => {
				const uiCtx = child;
				const store = new CoordinatorStore(remoteSource(() => uiCtx.remote.coordinator));
				uiCtx.effect(() => () => {
					store.dispose();
				}, "dsh-coordinator: state poller");
				const hooks = { coordinator: store };
				const goHome = () => {
					optional(uiCtx, "layout")?.selectPanel(PANEL_ID);
				};
				const dshPermission = () => {
					try {
						return ctx.locale.bind("permission.access");
					} catch {
						return;
					}
				};
				const dshApproval = () => {
					try {
						return ctx.locale.bind("approval");
					} catch {
						return;
					}
				};
				const openReal = async (sessionId) => {
					if (store.source.kind === "fake" && sessionId.startsWith("fake-")) return;
					await openSession(uiCtx, sessionId);
				};
				const actions = {
					openCoordinator: async (coordinatorId) => {
						const { coordinatorId: id, sessionId } = await store.source.ensureCoordinator(coordinatorId);
						store.select(id);
						store.refresh();
						await openReal(sessionId);
					},
					newCoordinator: async (home) => {
						const { coordinatorId, sessionId } = await store.source.createCoordinator(home);
						store.select(coordinatorId);
						store.refresh();
						await openReal(sessionId);
					},
					pickFolder: () => pickFolder(uiCtx),
					setCoordinatorFolder: async (coordinatorId, path) => {
						await store.source.setCoordinatorFolder(coordinatorId, path);
						store.refresh();
					},
					setExecutorPrompt: async (coordinatorId, text) => {
						await store.source.setExecutorPrompt(coordinatorId, text);
						store.refresh();
					},
					renameCoordinator: async (coordinatorId, name) => {
						await store.source.renameCoordinator(coordinatorId, name);
						store.refresh();
					},
					archiveCoordinator: async (coordinatorId, options) => {
						const result = await store.source.archiveCoordinator(coordinatorId, options);
						store.refresh();
						return result;
					},
					deleteCoordinator: async (coordinatorId) => {
						await store.source.deleteCoordinator(coordinatorId);
						store.refresh();
					},
					select: (coordinatorId) => {
						store.select(coordinatorId);
					},
					openSession: openReal,
					setThreadPermission: async (mode) => {
						await store.source.setThreadPermission(mode);
					},
					confirmFolder: async (id, decision) => {
						await store.source.confirmFolder(id, decision);
					},
					removeAllowedFolder: async (path) => {
						await store.source.removeAllowedFolder(path);
					},
					resumeThread: async (id) => {
						await store.source.resumeThread(id);
					},
					archiveThread: async (id) => {
						const layout = optional(uiCtx, "layout");
						const info = layout?.panelInfo;
						let stop = () => {};
						if (layout !== void 0 && info !== void 0 && info.getSnapshot().activePanelId === PANEL_ID) {
							const unsubscribe = info.subscribe(() => {
								if (info.getSnapshot().activePanelId === null) {
									stop();
									layout.selectPanel(PANEL_ID);
								}
							});
							const timer = setTimeout(() => {
								stop();
							}, 2e3);
							stop = () => {
								unsubscribe();
								clearTimeout(timer);
								stop = () => {};
							};
						}
						try {
							await store.source.archiveThread(id);
						} catch (error) {
							stop();
							throw error;
						}
					},
					refresh: () => {
						store.refresh();
					},
					holdFast: () => store.holdFast()
				};
				const togglePane = mountThreadsPane(uiCtx, {
					store,
					hooks,
					t,
					goHome,
					openSession: actions.openSession,
					openCoordinator: actions.openCoordinator,
					pickFolder: actions.pickFolder,
					setCoordinatorFolder: actions.setCoordinatorFolder,
					confirmFolder: actions.confirmFolder,
					resumeThread: actions.resumeThread,
					dshApproval
				});
				uiCtx.slots.inject("main", () => uiCtx.slots.register({
					name: "main",
					key: PANEL_ID,
					locale: NS,
					inject: () => ({
						hooks,
						...actions,
						dshPermission: dshPermission(),
						dshApproval: dshApproval()
					})
				}, CoordinatorPanel));
				uiCtx.slots.inject("sidebar.panellist", () => uiCtx.slots.register({
					name: "sidebar.panellist",
					id: PANEL_ID,
					order: 50,
					locale: NS,
					label: () => t("panel"),
					inject: () => ({ hooks })
				}, PanelIcon));
				uiCtx.slots.inject("conversation.session.header.utilities", () => uiCtx.slots.register({
					name: "conversation.session.header.utilities",
					id: "dsh-coordinator",
					order: -6,
					locale: NS,
					inject: () => ({
						hooks,
						togglePane
					})
				}, HeaderAction));
				uiCtx.slots.inject("sidebar.session.row.trailing", () => uiCtx.slots.register({
					name: "sidebar.session.row.trailing",
					id: "dsh-coordinator.row",
					order: 30,
					locale: NS,
					inject: () => ({ hooks })
				}, CoordinatorRowTrailing));
				uiCtx.slots.inject("sidebar.session.row.hover", () => uiCtx.slots.register({
					name: "sidebar.session.row.hover",
					id: "dsh-coordinator.row",
					order: 30,
					locale: NS,
					inject: () => ({ hooks })
				}, CoordinatorRowHover));
				uiCtx.slots.inject("conversation.chat.user.before", () => uiCtx.slots.register({
					name: "conversation.chat.user.before",
					locale: NS,
					select: originOf
				}, OriginLine));
				uiCtx.slots.inject("conversation.chat.turnTail", () => uiCtx.slots.register({
					name: "conversation.chat.turnTail",
					id: "dsh-coordinator-welcome",
					order: 0,
					locale: NS,
					inject: (sessionId) => ({
						hooks,
						sessionId,
						goHome,
						fillDraft: (text) => {
							fillDraft(uiCtx, sessionId, text);
						}
					})
				}, Welcome));
			});
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
