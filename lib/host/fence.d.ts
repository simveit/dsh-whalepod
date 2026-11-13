/** Tag of the data block; each block adds a random suffix (`<thread-data-k3f9q2 from="t-1">`). */
export declare const FENCE_TAG = "thread-data";
/** Header placed before data blocks; the coordinator prompt repeats the rule. */
export declare const UNTRUSTED_HEADER: string;
/**
 * Directional overrides and invisible characters that can disguise text: soft hyphen, combining grapheme joiner,
 * Mongolian selectors, zero-width and bidi controls, Hangul fillers, variation selectors, the BOM, interlinear
 * annotation marks, and the Unicode tag characters.
 */
export declare const INVISIBLE: RegExp;
/**
 * Remove escape sequences, control characters and invisible characters. Keeps newlines and tabs.
 * @param text - untrusted text.
 * @returns the cleaned text.
 */
export declare function stripControls(text: string): string;
/**
 * Cap text at `max` characters (code points are not split), marking how much was cut.
 * @param text - text to cap.
 * @param max - maximum length of the result, at least 40.
 */
export declare function capLength(text: string, max: number): string;
/**
 * Replace every delimiter look-alike in a payload with a harmless marker. The text is NFKC-normalised (full-width
 * and other compatibility forms become ASCII), entities for `<` are decoded, and confusable letters, angles, slashes
 * and separators are folded before matching, so `＜/thread-data＞`, `‹/thrеad·data>` or `&lt;/thread-data>` are
 * caught as well.
 */
export declare function neutraliseDelimiters(text: string): string;
/**
 * Clean untrusted text for use inside a data block: controls stripped, delimiters neutralised, length capped.
 * @param text - untrusted text.
 * @param max - maximum length.
 */
export declare function cleanUntrusted(text: string, max: number): string;
/**
 * One line of untrusted text for a label, such as a thread title or a one-line summary: cleaned, whitespace
 * collapsed, quotes replaced so the value cannot end a quoted string early, and capped.
 * @param text - untrusted text.
 * @param max - maximum length.
 */
export declare function inlineUntrusted(text: string, max: number): string;
/**
 * A folder path as the plugin writes it into its own lines (notes, alerts, cards, the trusted `cwd` field), S10:
 * control characters, line breaks and invisible characters become `?`, and the length is capped. The guard already
 * refuses such paths when they enter; this keeps an older stored path from speaking in the plugin's voice.
 */
export declare function pathText(path: string, max?: number): string;
export interface FenceField {
    /** Field name, chosen by the plugin (trusted). */
    name: string;
    /** Untrusted value. */
    value: string;
    /** Cap for this value. */
    max: number;
}
/**
 * Wrap untrusted fields in one data block. Field names and the `from` attribute are written by the plugin; only the
 * values are untrusted.
 * @param from - who produced the data, for example a thread id (plugin-generated; anything else is removed).
 * @param fields - untrusted values with their names and caps; empty values are left out.
 * @returns the block, or an empty string when no field has a value.
 */
export declare function fence(from: string, fields: readonly FenceField[], nonce?: string): string;
/** A random suffix for one data block's tag, so a payload cannot predict the closing delimiter. */
export declare function blockNonce(): string;
