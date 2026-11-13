/**
 * The settings fields of the Plugins page and how their text is read. Pure; no browser or React code, so tests read
 * it. It mirrors `CONFIG_FIELDS` in src/host/config-schema.ts (the host cannot be imported into the client bundle);
 * tests/config-schema.test.ts checks that both and `parseConfig` agree. The host sanitizes every value again on read.
 */

/** One field on the page. Keys are the config keys; labels come from locales.ts (`settings.<key>`). */
export interface SettingsFieldDef {
  key: string
  kind: 'count' | 'duration' | 'choice' | 'path' | 'list'
  min?: number
  integer?: boolean
  choices?: readonly string[]
}

/** Sections of the page, in order. `threadsRoot` is legacy and not on the page (dsh offers only volatile fields). */
export const SETTINGS_SECTIONS: readonly { id: string; fields: readonly SettingsFieldDef[] }[] = [
  {
    id: 'capacity',
    fields: [
      { key: 'maxRunningThreads', kind: 'count', min: 1, integer: true },
      { key: 'threadTurnBudget', kind: 'count', min: 0, integer: true },
    ],
  },
  {
    id: 'brakes',
    fields: [
      { key: 'wakeMaxPerThread', kind: 'count', min: 1, integer: true },
      { key: 'wakeWindowMs', kind: 'duration', min: 1000 },
      { key: 'peerMaxPerPair', kind: 'count', min: 1, integer: true },
      { key: 'peerMaxPerThread', kind: 'count', min: 1, integer: true },
      { key: 'peerWindowMs', kind: 'duration', min: 1000 },
    ],
  },
  {
    id: 'notices',
    fields: [
      { key: 'noticeDebounceMs', kind: 'duration', min: 0 },
      { key: 'noticeMaxDelayMs', kind: 'duration', min: 0 },
    ],
  },
  {
    id: 'behaviour',
    fields: [
      { key: 'threadPermission', kind: 'choice', choices: ['auto', 'ask'] },
      { key: 'briefAs', kind: 'choice', choices: ['user', 'notice'] },
      { key: 'coordinatorBase', kind: 'path' },
      { key: 'coordinatorExtraTools', kind: 'list' },
    ],
  },
]

/** Names accepted in `coordinatorExtraTools`, as parseConfig accepts them. */
const TOOL_NAME = /^[\w.:-]{1,100}$/

/** A staged write, as dsh's form model expects it. */
export type FieldWrite = { kind: 'set'; value: unknown } | { kind: 'clear' }

/** How a field's stored value becomes text and text becomes a write; undefined for invalid text. */
export interface FieldCodec {
  field: string
  format: (value: unknown) => string
  parse: (text: string) => FieldWrite | undefined
}

/**
 * The codec of one field. Empty text clears the field (back to the default beneath the profile).
 * @param def - the field.
 */
export function fieldCodec(def: SettingsFieldDef): FieldCodec {
  switch (def.kind) {
    case 'count':
    case 'duration':
      return {
        field: def.key,
        format: value => (typeof value === 'number' ? String(value) : ''),
        parse: (text) => {
          const trimmed = text.trim()
          if (trimmed === '') return { kind: 'clear' }
          if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined
          const value = Number(trimmed)
          if (!Number.isFinite(value) || value < (def.min ?? 0)) return undefined
          if (def.integer === true && !Number.isSafeInteger(value)) return undefined
          return { kind: 'set', value }
        },
      }
    case 'choice':
      return {
        field: def.key,
        format: value => (typeof value === 'string' ? value : ''),
        parse: (text) => {
          if (text === '') return { kind: 'clear' }
          return def.choices?.includes(text) === true ? { kind: 'set', value: text } : undefined
        },
      }
    case 'path':
      return {
        field: def.key,
        format: value => (typeof value === 'string' ? value : ''),
        parse: (text) => {
          const trimmed = text.trim()
          if (trimmed === '') return { kind: 'clear' }
          // An absolute or home-relative folder without control characters; the host refuses system and dot folders.
          if (!(trimmed === '~' || trimmed.startsWith('~/') || trimmed.startsWith('/')) || /[\u0000-\u001F\u007F]/.test(trimmed)) return undefined
          return { kind: 'set', value: trimmed }
        },
      }
    case 'list':
      return {
        field: def.key,
        format: value => (Array.isArray(value) ? value.filter(item => typeof item === 'string').join(', ') : ''),
        parse: (text) => {
          const names = text.split(/[\s,]+/).map(name => name.trim()).filter(name => name !== '')
          if (names.length > 50 || names.some(name => !TOOL_NAME.test(name))) return undefined
          return { kind: 'set', value: [...new Set(names)] }
        },
      }
  }
}

/** Every field of the page, flat. */
export function settingsFields(): SettingsFieldDef[] {
  return SETTINGS_SECTIONS.flatMap(section => section.fields)
}
