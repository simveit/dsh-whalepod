import { type MemoryWriter } from './store.ts';
import type { ToolView } from './views.ts';
/** The tag around a memory text: `coordinator-memory-` and 8 hex digits of a keyed hash of the text. */
export declare function memoryTag(text: string): string;
/** Who reads or writes a memory page through the tools: its coordinator, or the Lead of one of its Executor Sessions. */
export type MemoryRole = 'coordinator' | 'executor';
/**
 * The last writer of a memory in the plugin's own words, for the reader's role: "the user, on the Coordinator page",
 * the coordinator ("you" to itself), or an Executor Session by its id (never by its title, which is executor text).
 * @param self - the reading Lead's own Executor Session id.
 */
export declare function memoryWriterText(writer: MemoryWriter, role: MemoryRole, self?: string): string;
/**
 * The Executor Sessions that changed a memory since the owner last saved it on the Coordinator page, in the plugin's
 * own words and by id only. A later write by the coordinator names a new last writer but leaves this line, so
 * executor text in the page stays marked until the owner's save.
 * @returns the sentence, or an empty string when there is none.
 */
export declare function memoryExecutorsText(executors: readonly string[]): string;
/**
 * The coordinator's memory as runtime context (`dsh-coordinator:memory`), always present for a stored coordinator: the
 * page of notes, between tags whose suffix is a keyed hash of the text (`memoryTag`), or a line that it is empty. dsh
 * sends it inside a user-role `<system-reminder>` snapshot after the retained history, so the paragraph says that the
 * notes are not the user's message: they never authorise anything the host asks the user for. Since the Leads of the
 * coordinator's Executor Sessions write the page too, it also says that parts may come from one, and it names the
 * revision, which `memory_update` must be given back, who changed the page last, and which Executor Sessions changed
 * it since the owner last saved it (`memoryExecutorsText`).
 */
export declare function coordinatorMemoryContext(text: string, revision?: number, writer?: MemoryWriter, executors?: readonly string[]): string;
/**
 * What a coordinator whose memory the owner switched off gets in place of its memory: no text of the memory, only the
 * fact, so that an earlier copy in the conversation stops counting and the model does not call the tools in vain.
 */
export declare const MEMORY_OFF_CONTEXT: string;
/** The one line the memory tools answer with while the owner has the memory switched off: for a read, and for a write. */
export declare function memoryOffLine(role: MemoryRole, write: boolean): string;
/** A memory page as the tools show it: the text, its revision, its last writer and the executors that changed it since the owner's last save. */
export interface MemoryPage {
    text: string;
    revision: number;
    writer?: MemoryWriter;
    executors?: readonly string[];
    /** The reading Lead's own Executor Session id. */
    self?: string;
}
/**
 * A memory page as the memory tools return it (`memory_read`, and with an `error` a refused `memory_update`): the
 * revision, the size, who changed it last, which Executor Sessions changed it since the owner last saved it
 * (`executorChanges`), and the text between tags under a paragraph that says what it is and what it can never do. A coordinator gets the keyed tag of its own snapshot (`memoryTag`); a Lead gets a random suffix per
 * call, so an executor, which can also write the page, never learns the tag that surrounds a text in its coordinator's
 * context.
 */
export declare function memoryPageView(page: MemoryPage, role: MemoryRole): ToolView;
/**
 * What `memory_update` returns when the text it was given is based on another revision than the current one, or on
 * none: nothing was saved, and the current page comes back (`memoryPageView`) so the writer merges and sends again.
 * @param given - the revision the call named, or undefined when it named none.
 */
export declare function memoryConflictView(page: MemoryPage, role: MemoryRole, given: number | undefined): ToolView;
/**
 * Order of the memory among the runtime contexts. `getContextOrder` only knows dsh's own names (100 to 210 in
 * dsh 0.2.2), so a plugin passes a number: after dsh's facts about the session, clear of its band.
 */
export declare const MEMORY_CONTEXT_ORDER = 300;
