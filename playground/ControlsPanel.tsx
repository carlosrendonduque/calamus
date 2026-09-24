import { CONTROLS, CONTROL_GROUPS, type Control } from "./controls";
import type { ExplorerState, StateUpdater } from "./state";

type ControlsPanelProps = {
  state: ExplorerState;
  onChange: StateUpdater;
};

type RenderProps = {
  control: Control;
  state: ExplorerState;
  onChange: StateUpdater;
};

/** One switch over the control kinds. Every control in controls.ts goes through here. */
export function renderControl({ control, state, onChange }: RenderProps) {
  const hintId = control.hint ? `${control.id}-hint` : undefined;

  const field = () => {
    switch (control.kind) {
      case "buttons":
        return (
          <div className="control__buttons" role="group" aria-labelledby={`${control.id}-label`}>
            {control.options.map((option) => {
              const pressed = control.get(state) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={pressed}
                  className={pressed ? "is-active" : undefined}
                  onClick={() => onChange((previous) => control.set(previous, option.value))}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      case "select":
        return (
          <select
            id={control.id}
            aria-describedby={hintId}
            value={control.get(state)}
            onChange={(event) => onChange((previous) => control.set(previous, event.target.value))}
          >
            {control.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case "text":
        return control.rows ? (
          <textarea
            id={control.id}
            aria-describedby={hintId}
            rows={control.rows}
            value={control.get(state)}
            onChange={(event) => onChange((previous) => control.set(previous, event.target.value))}
          />
        ) : (
          <input
            id={control.id}
            type="text"
            aria-describedby={hintId}
            placeholder={control.placeholder}
            value={control.get(state)}
            onChange={(event) => onChange((previous) => control.set(previous, event.target.value))}
          />
        );
      case "range":
        return (
          <span className="control__range">
            <input
              id={control.id}
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              aria-describedby={hintId}
              value={control.get(state)}
              onChange={(event) => onChange((previous) => control.set(previous, Number(event.target.value)))}
            />
            <output htmlFor={control.id}>{control.format(control.get(state))}</output>
          </span>
        );
      case "toggle":
        return (
          <input
            id={control.id}
            type="checkbox"
            aria-describedby={hintId}
            checked={control.get(state)}
            onChange={(event) => onChange((previous) => control.set(previous, event.target.checked))}
          />
        );
      case "color":
        return (
          <span className="control__color">
            <input
              id={control.id}
              type="color"
              value={control.get(state)}
              onChange={(event) => onChange((previous) => control.set(previous, event.target.value))}
            />
            <code>{control.get(state)}</code>
          </span>
        );
      case "action":
        return (
          <button
            type="button"
            id={control.id}
            aria-describedby={hintId}
            aria-pressed={control.pressed(state)}
            className={control.pressed(state) ? "is-active" : undefined}
            onClick={() => onChange((previous) => control.apply(previous, !control.pressed(previous)))}
          >
            {control.action}
          </button>
        );
    }
  };

  const isGrouped = control.kind === "buttons";
  const isStandaloneButton = control.kind === "action";

  return (
    <div className={`control control--${control.kind}`} key={control.id}>
      {isGrouped || isStandaloneButton ? (
        <span className="control__label" id={`${control.id}-label`}>
          {control.label}
        </span>
      ) : (
        <label className="control__label" htmlFor={control.id}>
          {control.label}
        </label>
      )}
      {field()}
      {control.hint ? (
        <p className="control__hint" id={hintId}>
          {control.hint}
        </p>
      ) : null}
    </div>
  );
}

export function ControlsPanel({ state, onChange }: ControlsPanelProps) {
  return (
    <section className="explorer__panel" aria-labelledby="controls-heading">
      <h2 id="controls-heading">Props</h2>
      {CONTROL_GROUPS.map((group) => {
        const controls = CONTROLS.filter(
          (control) => control.group === group && (control.visible?.(state) ?? true)
        );

        if (controls.length === 0) {
          return null;
        }

        return (
          <fieldset className="explorer__fieldset" key={group}>
            <legend>{group}</legend>
            {controls.map((control) => renderControl({ control, state, onChange }))}
          </fieldset>
        );
      })}
    </section>
  );
}
