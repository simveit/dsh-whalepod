/**
 * The plugin's settings on dsh's Plugins page: clicking dsh-coordinator there shows this form, as dsh's own Subagent
 * page does for its limits. It edits the volatile fields of the host entry `dsh-coordinator` through dsh's shared
 * configuration form (`ctx.configForms`), and dsh saves them as that entry's `config` in the profile's patch. The
 * running host reads the new values at once (Volatile references, config-schema.ts); nothing restarts.
 *
 * Registered into the Plugins page's `plugins.bundle.config` slot (keyed by the bundle's package name) while the Host
 * serves the entry's settings. dsh's form primitives come from the page's shared module table.
 */
import type { Context } from '@deepseek-ai/cordis'
import { SegmentedControl, SettingsForm, SettingsFormModel, SettingsValueField, type SettingsFieldState, type SettingsFormActions, type SettingsFormScope, type SettingsFormShell, type SettingsStore } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from './locales.ts'
import { fieldCodec, settingsFields, SETTINGS_SECTIONS, type SettingsFieldDef } from './settings-fields.ts'

/** The host entry id (the bundle patch's row id, kept from before the rename) and the bundle's package name. */
export const ENTRY_ID = 'dsh-coordinator'
const PACKAGE_NAME = 'dsh-whalepod'

interface ConfigForms {
  get<T>(entryId: string): SettingsFormScope<T>
  whileServed(namespaces: readonly string[], register: (served: ReadonlySet<string>) => () => void): () => void
}
interface Slots {
  inject(slot: string, register: () => () => void): () => void
  register(options: Record<string, unknown>, component: (props: never) => unknown): () => void
}

/** What the page renders. */
export interface SettingsPageState extends SettingsFormShell {
  fields: Record<string, SettingsFieldState>
}

type SettingsPageProps = SettingsFormActions & {
  t: Translate
  view?: 'page' | 'summary'
  useCoordinatorSettings: <S>(select: (state: SettingsPageState) => S) => S
}

/**
 * Mount the page while dsh's settings forms and the Plugins page exist (both optional: without them, no page).
 * @param ctx - the plugin's client context.
 */
export function mountSettingsPage(ctx: Context): void {
  ctx.inject(['configForms', 'slots'], (child) => {
    const forms = (child as unknown as { configForms: ConfigForms }).configForms
    const slots = (child as unknown as { slots: Slots }).slots
    const model = new SettingsFormModel(forms.get(ENTRY_ID), settingsFields().map(fieldCodec))
    const store: SettingsStore<SettingsPageState> = model.bind(() => ({
      ...model.shell(),
      fields: Object.fromEntries(settingsFields().map(def => [def.key, model.field(def.key)])),
    }))
    child.effect(() => () => { model.dispose() }, 'dsh-coordinator: settings form')
    // As dsh's own settings pages: the registration lives while the Host serves the entry's settings.
    child.effect(() => forms.whileServed([ENTRY_ID], () => slots.inject('plugins.bundle.config', () => slots.register({
      name: 'plugins.bundle.config',
      key: PACKAGE_NAME,
      locale: 'dsh-coordinator',
      inject: () => ({ hooks: { coordinatorSettings: store }, ...model.actions() }),
    }, SettingsPage as never))), 'dsh-coordinator: settings page')
  })
}

/** The page: grouped fields, one save. */
function SettingsPage(props: SettingsPageProps) {
  const { t } = props
  const state = props.useCoordinatorSettings(snapshot => snapshot)
  if (props.view === 'summary') return t('settings.summary')
  const disabled = !state.writable || state.saving
  return (
    <SettingsForm
      labels={{ unavailable: t('settings.unavailable'), readOnly: t('settings.readOnly'), saveFailed: t('settings.saveFailed'), save: t('settings.save'), saving: t('settings.saving') }}
      state={state} onSave={props.save} onDiscard={props.discard}>
      {SETTINGS_SECTIONS.map(section => (
        <section key={section.id} className="dco-settings-section" aria-labelledby={`dco-settings-${section.id}`}>
          <h3 className="dco-settings-heading" id={`dco-settings-${section.id}`}>{t(`settings.section.${section.id}`)}</h3>
          <div className="dco-settings-grid">
            {/* Each field in its own cell, as on the Subagent page: dsh's field style rules adjacent fields apart. */}
            {section.fields.map(def => (
              <div key={def.key} className="dco-settings-cell">
                <Field def={def} state={state.fields[def.key]!} disabled={disabled} {...props} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="dco-settings-note">{t('settings.note')}</p>
    </SettingsForm>
  )
}

function Field(props: SettingsPageProps & { def: SettingsFieldDef; state: SettingsFieldState; disabled: boolean }) {
  const { t, def, state, disabled } = props
  const id = `dco-setting-${def.key}`
  if (def.kind === 'choice') {
    const current = state.text === '' ? def.choices![0]! : state.text
    return (
      <div className="dco-settings-choice">
        <div className="dco-settings-choice-head">
          <span className="dco-settings-label" id={`${id}-label`}>{t(`settings.${def.key}`)}</span>
          {state.overridden
            ? <button type="button" className="dco-settings-reset" disabled={disabled} onClick={() => { props.resetField(def.key) }}>{t('settings.reset')}</button>
            : null}
        </div>
        <SegmentedControl id={id} label={t(`settings.${def.key}`)} value={current} disabled={disabled}
          options={def.choices!.map(choice => ({ value: choice, label: t(`settings.${def.key}.${choice}`) }))}
          onChange={(value) => { props.edit(def.key, value) }} />
        <p className="dco-settings-hint">{t(`settings.${def.key}.hint`)}</p>
      </div>
    )
  }
  return (
    <SettingsValueField id={id} label={t(`settings.${def.key}`)} hint={t(`settings.${def.key}.hint`)}
      overriddenLabel={t('settings.overridden')} resetLabel={t('settings.reset')} invalidLabel={t(`settings.invalid.${def.kind}`, { min: def.min ?? 0 })}
      numeric={def.kind === 'count' || def.kind === 'duration'} disabled={disabled}
      {...(def.kind === 'path' ? { placeholder: t('settings.coordinatorBase.placeholder') } : {})}
      {...state}
      onEdit={(text) => { props.edit(def.key, text) }} onReset={() => { props.resetField(def.key) }} />
  )
}
