/**
 * The logic of the model rows on the Coordinator page (models.tsx), without React so it is unit tested directly: how a
 * choice is named, which option of a select stands for it, and the reasoning effort rules, which follow dsh's own
 * model picker (dsh-client-ui-model-selection, dsh 0.2.2-rc.3): picking a model takes its default effort, or keeps the
 * effort already chosen when the model stays the same; "Default" is offered only for a model without a default effort.
 */
import type { ModelChoice, ModelChoices, ModelOption, ModelSettingState } from '../types.ts'

type ModelGroup = ModelChoices['groups'][number]

/** The value of a model's `<option>`: both ids as JSON, so no separator an id may contain can mix them up. It is only compared, never parsed. */
export function optionValue(provider: string, model: string): string {
  return JSON.stringify([provider, model])
}

/** The listed model an option value stands for. */
export function selectedModel(choices: ModelChoices | undefined, value: string): { group: ModelGroup; model: ModelOption } | undefined {
  for (const group of choices?.groups ?? []) {
    for (const model of group.models) if (optionValue(group.id, model.id) === value) return { group, model }
  }
  return undefined
}

/** The listed model of a choice, or undefined when the list does not have it (any more). */
export function listedModel(choices: ModelChoices | undefined, choice: ModelChoice | undefined): { group: ModelGroup; model: ModelOption } | undefined {
  return choice === undefined ? undefined : selectedModel(choices, optionValue(choice.provider, choice.model))
}

/**
 * A choice as the composer names it: the model's name and, when it has one, the name of its effort (the chosen one,
 * else the model's default). A model the list does not have shows its ids.
 */
export function modelName(choices: ModelChoices | undefined, choice: ModelChoice): string {
  const found = listedModel(choices, choice)
  if (found === undefined) return `${choice.provider}/${choice.model}`
  const effort = choice.reasoningEffort ?? found.model.defaultEffort
  const name = effort === undefined ? undefined : found.model.efforts?.find(e => e.id === effort)?.name ?? effort
  return name === undefined ? found.model.name : `${found.model.name} · ${name}`
}

/**
 * The model a coordinator's chat runs on when that is not the stored coordinator model, else undefined. The two differ
 * when the chat was restored from dsh's archive after the setting changed, or when its model changed while the plugin
 * was not loaded. The host reports the chat's own model as `effective` only for an open chat that is loaded, so a chat
 * that is not loaded shows no difference. A stored model dsh does not offer has its own note.
 */
export function chatRunsOn(stored: ModelChoice | undefined, state: ModelSettingState | undefined): ModelChoice | undefined {
  const chat = state?.effective
  if (stored === undefined || chat === undefined || state?.available !== true) return undefined
  return chat.provider === stored.provider && chat.model === stored.model && chat.reasoningEffort === stored.reasoningEffort ? undefined : chat
}

/** The choice for a picked model option: see the file comment for the effort. Undefined for a value that is no listed model. */
export function withModel(choices: ModelChoices | undefined, value: string, current: ModelChoice | undefined): ModelChoice | undefined {
  const found = selectedModel(choices, value)
  if (found === undefined) return undefined
  const same = current?.provider === found.group.id && current.model === found.model.id
  const kept = same && found.model.efforts?.some(e => e.id === current.reasoningEffort) === true ? current.reasoningEffort : undefined
  const effort = kept ?? found.model.defaultEffort
  return { provider: found.group.id, model: found.model.id, ...(effort === undefined ? {} : { reasoningEffort: effort }) }
}

/** The options of the effort select of a model; none for a model without efforts. `''` stands for the provider's default. */
export function effortOptions(model: ModelOption, defaultLabel: string): { value: string; name: string }[] {
  if (model.efforts === undefined || model.efforts.length === 0) return []
  return [...(model.defaultEffort === undefined ? [{ value: '', name: defaultLabel }] : []), ...model.efforts.map(e => ({ value: e.id, name: e.name }))]
}

/** The same model with another effort; `''` leaves the effort to the provider. */
export function withEffort(current: ModelChoice, value: string): ModelChoice {
  return { provider: current.provider, model: current.model, ...(value === '' ? {} : { reasoningEffort: value }) }
}
