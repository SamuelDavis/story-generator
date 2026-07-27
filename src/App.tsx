import { createEffect, createMemo, createSignal, For, onMount } from "solid-js";
import data from "./data.json";
import { createStore, produce } from "solid-js/store";

export default function App() {
  const [state, setState] = createStore<Partial<Record<string, string>>>({});
  const [getPostPrompt, setPostPrompt] = createSignal(
    localStorage.getItem("post-prompt") ?? "",
  );
  createEffect(() => localStorage.setItem("post-prompt", getPostPrompt()));

  const getEntries = () => Object.entries(data);
  const getFlattenedOptions = createMemo(
    (): Record<string, Record<string, string>> =>
      Object.entries(data).reduce((acc, [key, value]) => {
        const flat = Object.entries(value).reduce((acc, [key, value]) => {
          if (typeof value === "string") return { ...acc, [key]: value };
          if (typeof value === "object") return { ...acc, ...value };

          return acc;
        }, {});
        return { ...acc, [key]: flat };
      }, {}),
  );
  const getPrompt = () => {
    let acc: string[] = [];
    const flattened = getFlattenedOptions();
    for (const [key = "", value = ""] of Object.entries(state)) {
      const flat = flattened[key]?.[value];
      const last = flat ? `${value}: ${flat}` : value;
      acc = [...acc, key, last];
    }
    return [acc.join("\n").trim(), getPostPrompt().trim()]
      .filter(Boolean)
      .join("\n\n");
  };

  function onSetOption(
    key: string,
    event: Event & { currentTarget: HTMLSelectElement },
  ): void {
    setState(
      produce((state) => {
        state[key] = event.currentTarget.value;
      }),
    );
  }

  function onRandomize(): void {
    const selects = document.body.querySelectorAll("select");
    selects.forEach((select) => {
      const options = select.querySelectorAll("option");
      const index = Math.floor(Math.random() * options.length);
      const option = options.item(index);
      option.selected = true;
      setState(
        produce((state) => {
          state[select.name] = option.value;
        }),
      );
    });
  }

  function onPostPrompt(
    event: Event & { currentTarget: HTMLTextAreaElement },
  ): void {
    setPostPrompt(event.currentTarget.value);
  }

  function onCopyPrompt(): void {
    window.navigator.clipboard.writeText(getPrompt());
  }

  onMount(() => {
    onRandomize();
  });

  return (
    <main>
      <article>
        <header>
          <button onClick={onRandomize}>Randomize</button>
        </header>
        <hr />
        <section>
          <For each={getEntries()}>
            {([key, value]) => {
              const selected = state[key] ?? "";
              return (
                <label>
                  <div>{key}</div>
                  <select
                    name={key}
                    id={key}
                    onChange={[onSetOption, key]}
                    value={selected}
                    required
                  >
                    <Options data={value} selected={selected} />
                  </select>
                </label>
              );
            }}
          </For>
          <div>
            <label>
              <div>Post-Prompt Text</div>
              <textarea
                name="post-prompt"
                id="post-prompt"
                onInput={onPostPrompt}
              >
                {getPostPrompt()}
              </textarea>
            </label>
          </div>
        </section>
        <aside>
          <button onClick={onCopyPrompt}>Copy Prompt</button>
          <output style={{ cursor: "pointer" }}>
            <pre>{getPrompt()}</pre>
          </output>
        </aside>
      </article>
    </main>
  );
}

function Options<T extends Record<string, string>>(props: {
  data: Record<string, string | T>;
  selected: string;
}) {
  const entries = Object.entries(props.data);
  return (
    <For each={entries}>
      {([key, value]) => {
        if (typeof value === "string")
          return (
            <option
              value={key}
              title={value}
              selected={props.selected === value}
            >
              {key}
            </option>
          );

        if (typeof value === "object")
          return (
            <optgroup label={key}>
              <Options {...props} data={value} />
            </optgroup>
          );

        throw TypeError(`Unhandled type ${typeof value}`, { cause: value });
      }}
    </For>
  );
}
