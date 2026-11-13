interface LogEvent {
    readonly type: string;
    readonly data: unknown;
}
/** Whether a `user/message` payload is a prompt the user typed. */
export declare function isUserTyped(message: unknown): boolean;
/** Text parts of every message the user typed in a session log, oldest first. */
export declare function userTypedTexts(events: readonly LogEvent[]): string[];
/**
 * Whether the current (last) turn of a session was opened by a message the user typed: one of the messages its
 * first step admitted. Steering the user typed later in the turn does not count, so a turn woken by a thread notice
 * stays a notice turn.
 * @returns false when the log has no turn.
 */
export declare function turnOpenedByUser(events: readonly LogEvent[]): boolean;
/**
 * Tools whose results carry thread text into the coordinator's context, under their current and their earlier names:
 * a log written before the rename, or a turn that spans the upgrade, still counts. `executor_flag_user` and
 * `executor_stop` return the row with its fenced title, detail and last Report too (S3), and `executor_start` may
 * return a row of a folder confirmation.
 */
export declare const THREAD_DATA_TOOLS: ReadonlySet<string>;
/**
 * Whether the current (last) turn has already put thread data in front of the coordinator: a thread notice or any
 * other message that is not the user's (agent messages, plugin notices), or a call of `executor_read` or
 * `executor_list`, `executor_flag_user` or `executor_stop` (or their earlier names). An Assignment written after that is
 * recorded with notice authority even in a turn the user opened, since planted text may have shaped it.
 */
export declare function turnSawThreadData(events: readonly LogEvent[]): boolean;
export {};
