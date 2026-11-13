/**
 * The parts of dsh's client primitives the settings page uses. The package comes from the page's shared module table
 * at runtime (external in tsdown.config.ts; dsh's own settings pages require it the same way), and its types are not
 * installed for this plugin. Shapes follow dsh 0.2.2-rc.2 (`SettingsFormModel`, `SettingsForm`, `SettingsValueField`,
 * `SegmentedControl` in @deepseek-ai/dsh-client-ui-primitives).
 */
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ReactNode } from 'react'

  /** A staged write of one field: a value, or back to the value beneath the profile override. */
  export type SettingsWrite = { kind: 'set'; value: unknown } | { kind: 'clear' }

  /** How one field turns its stored value into text and back; `parse` returns undefined for invalid text. */
  export interface SettingsFieldSpec {
    field: string
    format: (value: unknown) => string
    parse: (text: string) => SettingsWrite | undefined
  }

  /** What a field shows: its text, whether the profile overrides it, and whether the staged text is invalid. */
  export interface SettingsFieldState {
    text: string
    overridden: boolean
    invalid: boolean
  }

  /** The form's overall state. */
  export interface SettingsFormShell {
    available: boolean
    writable: boolean
    dirty: boolean
    invalid: boolean
    saving: boolean
    failed: boolean
  }

  export interface SettingsFormActions {
    edit: (field: string, text: string) => void
    resetField: (field: string) => void
    save: () => void
    discard: () => void
  }

  /** The shared configuration form of one Host plugin entry (`ctx.configForms.get(entryId)`). */
  export interface SettingsFormScope<T = unknown> {
    getSnapshot(): unknown
    subscribe(listener: () => void): () => void
    readonly __settings?: T
  }

  /** A store the slot renderer binds as a `use<Name>` hook. */
  export interface SettingsStore<S> {
    getSnapshot(): S
    subscribe(listener: () => void): () => void
  }

  export class SettingsFormModel<T = unknown> {
    constructor(scope: SettingsFormScope<T>, specs: SettingsFieldSpec[])
    bind<S>(project: () => S): SettingsStore<S>
    shell(): SettingsFormShell
    field(name: string): SettingsFieldState
    actions(): SettingsFormActions
    dispose(): void
  }

  export interface SettingsFormLabels {
    unavailable: string
    readOnly: string
    saveFailed: string
    save: string
    saving: string
  }

  export function SettingsForm(props: {
    labels: SettingsFormLabels
    state: SettingsFormShell
    onSave: () => void
    onDiscard: () => void
    children?: ReactNode
  }): ReactNode

  export function SettingsValueField(props: SettingsFieldState & {
    id: string
    label: string
    hint?: string
    help?: { label: string; content: ReactNode }
    placeholder?: string
    overriddenLabel: string
    resetLabel: string
    invalidLabel: string
    numeric?: boolean
    disabled?: boolean
    onEdit: (text: string) => void
    onReset: () => void
  }): ReactNode

  export function SegmentedControl(props: {
    id: string
    value: string
    options: readonly { value: string; label: string; title?: string; disabled?: boolean }[]
    onChange: (value: string) => void
    label: string
    disabled?: boolean
    className?: string
  }): ReactNode
}
