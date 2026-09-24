/**
 * The renderer: a narrative document plus a reading state, as React elements.
 *
 * Everything below is a plain function. No hooks, no refs, no effects — the
 * state machine lives in `reading.ts` and the DOM work lives in `Reader.tsx`, so
 * this file can be called in Node, walked as data, and rendered to a string
 * without a DOM (decision 6). That is also what makes it the compiler's renderer
 * as well as the component's: two artefacts, one renderer (decision 25).
 *
 * It calls the evaluator and never reimplements it. `gate` decides whether a
 * block is there, `resolveGroup` decides what a loop prints, `resolvePhrase` and
 * `interpolate` decide what a clause says, and `canEnter` / `canLeave` decide
 * where a reader may go. This file decides only what element each of those
 * answers becomes.
 *
 * Three rules it never breaks:
 *
 * - **Nothing throws.** A name that does not resolve, a registry entry that is
 *   not there, an island nobody understood: each has a written-down way of
 *   failing, and all of them end in something legible (decision 28).
 * - **No prose is lost.** A gate that cannot be read shows its block. An
 *   affordance whose condition is false keeps its words and loses its button. An
 *   unknown island is kept whole and re-serialised rather than dropped.
 * - **No authored name is a literal here.** Field names, mark kinds, move names,
 *   group names and roles all arrive as data and leave as data attributes
 *   (decision 30).
 */

import type { ReactElement, ReactNode } from "react";
import type {
  Block,
  BlockAttrs,
  Diagnostic,
  Exit,
  GroupItem,
  Inline,
  NarrativeDocument,
  NodeDef,
  ReadingState,
  Scalar,
  VariableDef,
} from "./types";
import type { Scope, Value } from "./evaluator";
import {
  asText,
  canEnter,
  canLeave,
  gate,
  isScalar,
  itemScope,
  resolveGroup,
  resolvePhrase,
  scopeFromDocument,
  truthy,
} from "./evaluator";
import { markupAttribute, plainText } from "./text";
import type { AffordanceProps, DocumentRegistry, SlotContext, SlotPass, SlotValue } from "./registry";
import { EMPTY_REGISTRY, isPermutation } from "./registry";
import type { Gesture } from "./moves";
import {
  currentOf,
  emptyGesture,
  gestureFor,
  matchesTemplate,
  resetOf,
  revealableRegions,
} from "./moves";
import type { Holder } from "./hold";
import { INERT_HOLDER } from "./hold";

/* -------------------------------------------------------------------------- */
/* What the renderer is given, and what it gives back                          */
/* -------------------------------------------------------------------------- */

export type RenderOptions = {
  document: NarrativeDocument;
  state: ReadingState;
  registry?: DocumentRegistry;
  /** Region ids the reader has revealed. A region reveals in place, which is not
   *  the trail and not a variable, so it is the renderer's state and not the
   *  document's. */
  shown?: ReadonlySet<string>;
  /** What a press asks for. Left out, every affordance renders and none fires,
   *  which is what the compiler's static pass wants. */
  onGesture?: (gesture: Gesture) => void;
  /** Bumped by the reader on every real change; a stale write is refused. */
  revision?: number;
  motion?: "full" | "reduce";
  /** Prefix for every id this renderer emits, so two readings of the same
   *  document on one page do not collide, and so a host's ids are never shadowed. */
  idPrefix?: string;
  /** The resource keeper. Absent in the measuring pass, by construction. */
  holder?: Holder;
  pass?: SlotPass;
  /** Answers `persisted()`. The reader knows; the evaluator must not ask. */
  persisted?: boolean;
};

export type RenderResult = {
  /** The node the reader is on, or null for a flat document (decision 22). */
  here: NodeDef | null;
  /** The prose. */
  body: ReactNode;
  /** The reader's controls, as a panel. Empty when the document declares none. */
  controls: ReactNode;
  /** The exits of the node the reader is on. Empty for a flat document. */
  exits: ReactNode;
  /**
   * The text of every block the author marked `live`, gathered rather than
   * rendered live. The library owns every live region (contrato-ranuras §5.2.2)
   * and its one announcer stays empty until the reader's first real gesture,
   * because mounting re-paginates and a block cannot tell a measurement from an
   * intention (decision 14b).
   */
  live: string;
  diagnostics: Diagnostic[];
};

/** Everything the walk carries. `scope` is the only field that changes as it
 *  descends, and it changes for exactly one reason: an item is bound. */
type Ctx = {
  document: NarrativeDocument;
  scope: Scope;
  registry: DocumentRegistry;
  shown: ReadonlySet<string>;
  revealable: Set<string>;
  onGesture: (gesture: Gesture) => void;
  diagnostics: Diagnostic[];
  live: string[];
  revision: number;
  motion: "full" | "reduce";
  prefix: string;
  holder: Holder;
  pass: SlotPass;
};

/* -------------------------------------------------------------------------- */
/* The entry point                                                             */
/* -------------------------------------------------------------------------- */

export function renderDocument(options: RenderOptions): RenderResult {
  const document = options.document;
  const diagnostics: Diagnostic[] = [];
  const live: string[] = [];

  const scope = scopeFromDocument(document, options.state, {
    registry: {
      plurals: options.registry?.plurals,
      derivations: options.registry?.derivations,
      orders: options.registry?.orders,
    },
    persisted: options.persisted ?? (options.state.readings ?? 1) > 1,
  });

  const ctx: Ctx = {
    document,
    scope,
    registry: options.registry ?? EMPTY_REGISTRY,
    shown: options.shown ?? new Set<string>(),
    revealable: revealableRegions(document),
    onGesture: options.onGesture ?? (() => undefined),
    diagnostics,
    live,
    revision: options.revision ?? 0,
    motion: options.motion ?? "full",
    prefix: options.idPrefix ?? "calamus",
    holder: options.holder ?? INERT_HOLDER,
    pass: options.pass ?? "live",
  };

  const here = nodeHere(document, options.state, diagnostics, scope);
  const blocks = here ? here.body : document.body;

  return {
    here,
    body: renderBlocks(blocks, ctx, "b"),
    controls: renderControls(ctx),
    exits: here ? renderExits(here, ctx) : null,
    live: live.filter(Boolean).join(" "),
    diagnostics,
  };
}

/**
 * Where the reader is. The starting node is *in* the trail, so a document that
 * opens on one has it already; a document whose trail is empty opens on its
 * first node; and a document with no nodes at all is the flat case, which is
 * what the four presentation modes have always rendered (decision 22).
 */
function nodeHere(
  document: NarrativeDocument,
  state: ReadingState,
  diagnostics: Diagnostic[],
  scope: Scope
): NodeDef | null {
  if (!document.nodes || document.nodes.length === 0) {
    return null;
  }

  const last = state.trail[state.trail.length - 1];
  const found = last ? document.nodes.find((node) => node.id === last) : undefined;

  if (last && !found) {
    diagnostics.push({ severity: "warning", message: `the trail ends on \`${last}\`, which is not a node` });
  }

  const node = found ?? document.nodes[0];

  // The second of the two gates. A node that refuses the reader still has to
  // put them somewhere, and the first node is the only place always available.
  if (!canEnter(node, scope) && node !== document.nodes[0]) {
    diagnostics.push({ severity: "warning", message: `\`${node.id}\` does not admit this reading` });
    return document.nodes[0];
  }

  return node;
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

function renderBlocks(blocks: Block[], ctx: Ctx, path: string): ReactNode[] {
  return blocks.map((block, index) => renderBlock(block, ctx, `${path}.${index}`));
}

function renderBlock(block: Block, ctx: Ctx, path: string): ReactNode {
  switch (block.kind) {
    case "paragraph":
      return renderParagraph(block, ctx, path);

    case "heading":
      return renderHeading(block, ctx, path);

    case "each":
      return renderEach(block, ctx, path);

    case "region":
      return renderRegion(block, ctx, path);

    case "slot":
      return renderBlockSlot(block, ctx, path);

    case "affordance":
      return renderBlockAffordance(block, ctx, path);

    case "blank":
      return renderBlank(block, path);

    case "unknown":
      return renderUnknown(block, path);

    default:
      return null;
  }
}

/**
 * A paragraph, with whatever its `:with` put on it.
 *
 * `role` and `voice` are names the **author** chose — `heading`, `caption`,
 * `time` — and they are emitted as data attributes rather than as ARIA roles.
 * Passing an authored word straight into `role=` would either invent an invalid
 * role or, worse, silently land on a real one and change the semantics of a
 * paragraph the author only meant to name. The author's word is kept, and the
 * stylesheet and the host can both see it.
 */
function renderParagraph(
  block: Extract<Block, { kind: "paragraph" }>,
  ctx: Ctx,
  path: string
): ReactNode {
  const passed = gate(block.attrs.when, ctx.scope);
  ctx.diagnostics.push(...passed.diagnostics);

  if (!passed.value) {
    return null;
  }

  const content = renderInlines(block.content, ctx, path);

  if (block.attrs.live) {
    ctx.live.push(textOf(block.content, ctx));
  }

  return (
    <p key={path} className="calamus__paragraph" {...attributesOf(block.attrs, ctx)}>
      {content}
    </p>
  );
}

function renderHeading(block: Extract<Block, { kind: "heading" }>, ctx: Ctx, path: string): ReactNode {
  // The mode already gave the reading an `h1` for the document's title, so an
  // authored `#` is the level below it. Three authored levels become h2..h4 and
  // the outline stays a single tree.
  const Tag = (["h2", "h3", "h4"] as const)[block.level - 1] ?? "h4";

  return (
    <Tag key={path} className="calamus__heading" data-level={block.level}>
      {renderInlines(block.content, ctx, path)}
    </Tag>
  );
}

/**
 * A loop over a group.
 *
 * `order:` is the one registry name that is **structure** rather than
 * presentation, which is why it is an attribute and not a component (decision 23
 * reconciled with decision 21, contrato-ranuras §3.1). A missing `orders` entry
 * falls to document order — the only fall that is always defined and always a
 * legal permutation — and says so, because this is the degradation that leaves
 * no residue at all: the page looks perfect and the work is a different work.
 */
function renderEach(block: Extract<Block, { kind: "each" }>, ctx: Ctx, path: string): ReactNode {
  const attrs = block.attrs ?? {};
  const passed = gate(attrs.when, ctx.scope);
  ctx.diagnostics.push(...passed.diagnostics);

  if (!passed.value) {
    return null;
  }

  const found = resolveGroup(block.group, ctx.scope);
  ctx.diagnostics.push(...found.diagnostics);

  let items = found.value ?? [];

  if (block.where) {
    const where = block.where;
    items = items.filter((item) => {
      const kept = gate(where, itemScope(ctx.scope, item));
      ctx.diagnostics.push(...kept.diagnostics);
      return kept.value;
    });
  }

  items = ordered(items, block.order, ctx);

  const heading = block.heading ? plainText(block.heading, ctx.scope) : "";
  const label = block.label ? plainText(block.label, ctx.scope) : "";
  const current = currentOf(block.current, ctx.scope);

  // Losing `empty:` loses prose: an exhausted group is usually the moment the
  // piece says something.
  const body =
    items.length === 0
      ? block.empty
        ? renderBlocks(block.empty, ctx, `${path}.empty`)
        : null
      : items.map((item, index) => renderItem(block, item, index, ctx, path, current));

  return (
    <div
      key={path}
      className="calamus__each"
      {...attributesOf(attrs, ctx, { withId: !hasTemplate(attrs.id) })}
      data-as={block.as}
      data-group-size={items.length}
    >
      {heading ? <p className="calamus__each-heading">{heading}</p> : null}
      {items.length === 0 ? (
        <div className="calamus__each-empty">{body}</div>
      ) : (
        <ul className="calamus__each-items" aria-label={label || undefined}>
          {body}
        </ul>
      )}
    </div>
  );
}

function renderItem(
  block: Extract<Block, { kind: "each" }>,
  item: GroupItem,
  index: number,
  ctx: Ctx,
  path: string,
  current: string | null
): ReactNode {
  const inner: Ctx = { ...ctx, scope: itemScope(ctx.scope, item) };
  const key = `${path}.${typeof item.id === "string" ? item.id : index}`;
  const attrs = block.attrs ?? {};

  // `id: anchor-body-{item.id}` on a loop names one id *per item*, not one for
  // the loop: an apparatus whose entries are revealed one at a time is written
  // exactly this way, and it is the only reading under which the id resolves.
  const id = hasTemplate(attrs.id) && attrs.id ? plainText(attrs.id, inner.scope) : null;
  const hidden = id !== null && isRevealable(id, ctx) && !ctx.shown.has(id);

  return (
    <li
      key={key}
      id={id ? domId(ctx, id) : undefined}
      className="calamus__each-item"
      hidden={hidden || undefined}
      aria-current={current !== null && asText(item.id ?? "") === current ? "true" : undefined}
      tabIndex={id ? -1 : undefined}
    >
      {renderBlocks(block.body, inner, key)}
    </li>
  );
}

function ordered(items: GroupItem[], name: string | undefined, ctx: Ctx): GroupItem[] {
  if (!name) {
    return items;
  }

  const entry = ctx.registry.orders?.[name];

  if (!entry) {
    ctx.diagnostics.push({
      severity: "warning",
      message: `no \`orders\` entry registered under \`${name}\`; the group prints in document order, which is a different reading`,
    });
    return items;
  }

  const ids = items.map((item) => String(item.id ?? ""));
  let permuted: string[];

  try {
    permuted = entry([...ids], ctx.scope.state) ?? ids;
  } catch {
    ctx.diagnostics.push({ severity: "warning", message: `the \`orders\` entry \`${name}\` threw; document order was used` });
    return items;
  }

  // An ordering that loses or duplicates an id loses or duplicates prose, so the
  // only result accepted is a permutation of what went in.
  if (!isPermutation(ids, permuted)) {
    ctx.diagnostics.push({
      severity: "warning",
      message: `the \`orders\` entry \`${name}\` did not return a permutation; document order was used`,
    });
    return items;
  }

  const byId = new Map(items.map((item) => [String(item.id ?? ""), item] as const));

  return permuted.map((id) => byId.get(id)).filter((item): item is GroupItem => item !== undefined);
}

/**
 * A region: revealed in place, where a node replaces.
 *
 * It starts closed, because that is what revealing means — but a region nothing
 * can open would take its prose out of the reading and never give it back, which
 * decision 28 does not allow. So only a region some affordance names starts shut.
 */
function renderRegion(block: Extract<Block, { kind: "region" }>, ctx: Ctx, path: string): ReactNode {
  const attrs = block.attrs ?? {};
  const passed = gate(attrs.when, ctx.scope);
  ctx.diagnostics.push(...passed.diagnostics);

  if (!passed.value) {
    return null;
  }

  const id = plainText(block.id, ctx.scope);
  const hidden = isRevealable(id, ctx) && !ctx.shown.has(id);

  if (attrs.live && !hidden) {
    ctx.live.push(textOfBlocks(block.body, ctx));
  }

  return (
    <div
      key={path}
      id={domId(ctx, id)}
      className="calamus__region"
      hidden={hidden || undefined}
      // The library moves the focus here on `:go{show=… focus=true}`, so the
      // region has to be able to receive it without becoming a tab stop.
      tabIndex={-1}
      {...attributesOf(attrs, ctx, { withId: false })}
    >
      {renderBlocks(block.body, ctx, path)}
    </div>
  );
}

/**
 * A registry view occupying a block.
 *
 * A missing entry renders the island's prose, which is the reserve the contract
 * counts on (§4). One caveat, and it is the parser's rather than this file's:
 * the parser reads a `slot:` island as a leaf, so `Block.slot.body` is always
 * empty and the prose that follows the island is a sibling. The reading still
 * loses nothing — the prose is on the page either way — but a *registered* view
 * cannot absorb it, so a host that registers one will see the prose twice.
 */
function renderBlockSlot(block: Extract<Block, { kind: "slot" }>, ctx: Ctx, path: string): ReactNode {
  const children = block.body.length > 0 ? renderBlocks(block.body, ctx, path) : null;
  const view = ctx.registry.views?.[block.name];

  if (!view) {
    ctx.diagnostics.push({
      severity: block.body.length > 0 ? "warning" : "error",
      message: `no \`views\` entry registered under \`${block.name}\`${
        block.body.length > 0 ? "; its region printed its prose" : "; the region had no prose to fall back to"
      }`,
    });

    return (
      <div key={path} className="calamus__slot calamus__slot--missing" data-slot={block.name}>
        {children}
      </div>
    );
  }

  return (
    <div key={path} className="calamus__slot" data-slot={block.name}>
      {renderView(view, block.name, block.params, children, ctx, path)}
    </div>
  );
}

function renderBlockAffordance(
  block: Extract<Block, { kind: "affordance" }>,
  ctx: Ctx,
  path: string
): ReactNode {
  const passed = gate(block.when, ctx.scope);
  ctx.diagnostics.push(...passed.diagnostics);

  // A control that stands on its own carries no prose but its label, so a
  // condition that is false takes the whole of it. "Disappearing is already the
  // `when:` of the exit", and a control is the same shape.
  if (!passed.value) {
    return null;
  }

  return affordanceElement(
    {
      key: path,
      action: block.action,
      target: block.target,
      spelled: block.gesture,
      children: plainText(block.label, ctx.scope),
      className: "calamus__control-button",
      block: true,
    },
    ctx,
    path
  );
}

function renderBlank(block: Extract<Block, { kind: "blank" }>, path: string): ReactNode {
  // In Mallarmé a blank measure is grammar rather than styling, so it is a real
  // element with a real height; the count governs the height in CSS, where the
  // arithmetic belongs (decision 29).
  return (
    <div
      key={path}
      className="calamus__blank"
      aria-hidden="true"
      style={{ ["--calamus-blank-lines" as string]: String(block.lines) }}
    />
  );
}

/**
 * An island whose name nothing resolved.
 *
 * Decision 28, and Lexical's `unknownState` before it: an unknown block is
 * omitted **visually** and kept whole, so a reader with an older renderer still
 * reads the prose and a round trip still writes the island back byte for byte.
 * Dropping it would be amputation, not degradation.
 */
function renderUnknown(block: Extract<Block, { kind: "unknown" }>, path: string): ReactNode {
  return (
    <div key={path} className="calamus__unknown" hidden data-calamus-unknown="">
      {block.raw}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline                                                                      */
/* -------------------------------------------------------------------------- */

function renderInlines(content: Inline[], ctx: Ctx, path: string): ReactNode[] {
  return content.map((item, index) => renderInline(item, ctx, `${path}:${index}`));
}

function renderInline(item: Inline, ctx: Ctx, path: string): ReactNode {
  switch (item.kind) {
    case "text":
      return item.text;

    case "interpolation":
      // Through `phrase.ts`, always, and never a second interpolator: the rule
      // that braces hold a name and never an expression, that a phrase may print
      // itself only once, and that the result is never scanned again all live
      // there. What comes back is escaped for an HTML text position; React is
      // about to escape it again, so `plainText` undoes that one escape and
      // lets React's be the only one.
      return plainText(`{${item.path}}`, ctx.scope);

    case "mark":
      return renderMark(item, ctx, path);

    case "affordance":
      return renderInlineAffordance(item, ctx, path);

    case "slot":
      return renderInlineSlot(item, ctx, path);

    default:
      return null;
  }
}

/**
 * `:mark[…]{kind=…}`. The kind is the author's word and the schema has no mark
 * classes of its own (decision 30), so it travels as data: a `marks` entry is
 * found through the vocabulary the author declared beside it, and when there is
 * none the text renders **unmarked**, keeping the author's accessible note.
 */
function renderMark(item: Extract<Inline, { kind: "mark" }>, ctx: Ctx, path: string): ReactNode {
  const children = renderInlines(item.children, ctx, path);
  const vocabulary = ctx.document.marks?.[item.markKind] ?? {};
  const entryName = typeof vocabulary.as === "string" ? vocabulary.as : item.markKind;
  const note = typeof vocabulary.note === "string" ? plainText(vocabulary.note, ctx.scope) : undefined;

  const passed = gate(item.when, ctx.scope);
  ctx.diagnostics.push(...passed.diagnostics);

  const entry = passed.value ? ctx.registry.marks?.[entryName] : undefined;

  if (!entry) {
    if (passed.value && ctx.registry.marks && !ctx.registry.marks[entryName]) {
      ctx.diagnostics.push({
        severity: "warning",
        message: `no \`marks\` entry registered under \`${entryName}\`; the text printed unmarked`,
      });
    }

    return (
      <span key={path} className="calamus__mark" data-mark={item.markKind} title={note}>
        {children}
      </span>
    );
  }

  return (
    <span key={path} className="calamus__mark" data-mark={item.markKind}>
      {entry({
        children,
        note,
        markKind: item.markKind,
        ctx: slotContext(entryName, `${ctx.prefix}:${path}`, {}, children, ctx),
      })}
    </span>
  );
}

function renderInlineAffordance(
  item: Extract<Inline, { kind: "affordance" }>,
  ctx: Ctx,
  path: string
): ReactNode {
  const passed = gate(item.when, ctx.scope);
  ctx.diagnostics.push(...passed.diagnostics);

  const children = renderInlines(item.children, ctx, path);

  // Inside a sentence the affordance *is* prose. A condition that is false takes
  // the button and leaves the words, because losing them would lose the line.
  if (!passed.value) {
    return (
      <span key={path} className="calamus__affordance calamus__affordance--closed">
        {children}
      </span>
    );
  }

  return affordanceElement(
    {
      key: path,
      action: item.action,
      target: item.target,
      focus: item.focus,
      // `item=` names the argument a move takes, so one move serves many spans,
      // and `id=` names the span itself so a return knows where to put the focus
      // back. Both are in the contract and the corpus writes both; the parser
      // does not yet carry either, so they are honoured when present and
      // substituted with the span's own position when not.
      argument: item.item,
      from: item.id ?? path,
      children,
      className: "calamus__affordance",
    },
    ctx,
    path
  );
}

function renderInlineSlot(item: Extract<Inline, { kind: "slot" }>, ctx: Ctx, path: string): ReactNode {
  const children = renderInlines(item.children, ctx, path);
  const view = ctx.registry.views?.[item.name];

  if (!view) {
    ctx.diagnostics.push({
      severity: "warning",
      message: `no \`views\` entry registered under \`${item.name}\`; the span printed its prose`,
    });

    return (
      <span key={path} className="calamus__slot calamus__slot--missing" data-slot={item.name}>
        {children}
      </span>
    );
  }

  return (
    <span key={path} className="calamus__slot" data-slot={item.name}>
      {renderView(view, item.name, item.params, children, ctx, path)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Affordances                                                                 */
/* -------------------------------------------------------------------------- */

type AffordanceSpec = {
  key: string;
  action: "go" | "show" | "do";
  target: string;
  focus?: boolean;
  argument?: string;
  from?: string;
  children: ReactNode;
  className: string;
  block?: boolean;
  spelled?: Extract<Block, { kind: "affordance" }>["gesture"];
  /** Names this reset before doing anything else: an exit may carry `resets:`. */
  resets?: string[];
};

/**
 * Every affordance is a real `<button>` or a real link. Never a click handler on
 * a span: a span is not focusable, does not answer the keyboard, is not in the
 * accessibility tree as a control, and is the single most common way a reader
 * like this one becomes unusable.
 *
 * `:go{to=}` is a link because it goes somewhere, and it carries a real `href`
 * so that the target is visible in the status bar and the keyboard contract is
 * the platform's. `:go{show=}` and `:do{move=}` are buttons, because revealing
 * and writing are not navigation.
 */
function affordanceElement(spec: AffordanceSpec, ctx: Ctx, path: string): ReactElement {
  const argumentItem = spec.argument ? itemNamed(spec.argument, ctx) : undefined;
  const scope = argumentItem ? itemScope(ctx.scope, argumentItem) : ctx.scope;
  const target = plainText(spec.target, scope);
  const isShown = spec.action === "show" && ctx.shown.has(target);

  const press = () => {
    const gesture = gestureFor(
      {
        action: spec.action,
        target: spec.target,
        focus: spec.focus,
        item: argumentItem,
        from: spec.from,
        spelled: spec.spelled,
        shown: isShown,
      },
      ctx.document,
      scope
    );

    if (spec.resets && spec.resets.length > 0) {
      gesture.moves.unshift(resetOf(spec.resets, ctx.document));
    }

    for (const message of gesture.diagnostics) {
      ctx.diagnostics.push({ severity: "warning", message });
    }

    ctx.onGesture(gesture);
  };

  const label = declaredNote(spec.target, ctx, scope);
  const shared = {
    className: spec.className,
    "aria-label": label,
    "data-calamus-action": spec.action,
    onClick: press,
  };

  if (spec.action === "go") {
    return (
      <a
        key={spec.key}
        {...shared}
        // A fragment, not a route: the library is embedded in somebody else's
        // page and must not claim their URL. The press is what navigates.
        href={`#${domId(ctx, target)}`}
        onClick={(event) => {
          event.preventDefault();
          press();
        }}
      >
        {spec.children}
      </a>
    );
  }

  if (spec.action === "show") {
    return (
      <button
        key={spec.key}
        type="button"
        {...shared}
        id={spec.from ? domId(ctx, spec.from) : undefined}
        aria-expanded={isShown}
        aria-controls={domId(ctx, target)}
      >
        {spec.children}
      </button>
    );
  }

  const pressed = pressedBy(spec.target, ctx, scope);

  return (
    <button
      key={spec.key}
      type="button"
      {...shared}
      id={spec.from ? domId(ctx, spec.from) : undefined}
      aria-pressed={pressed}
    >
      {spec.children}
    </button>
  );
}

/**
 * The accessible name of an affordance, when the author declared one.
 *
 * `note:` on a move is prose, usually a phrase, and it is what a screen reader
 * hears — "Reveal the redacted words" over a span whose visible words are the
 * sentence itself. The name is always the author's text; the library never
 * invents one (contrato-ranuras §5.2.1).
 */
function declaredNote(target: string, ctx: Ctx, scope: Scope): string | undefined {
  const declared = ctx.document.moves?.[target] as Record<string, unknown> | undefined;

  if (!declared || typeof declared.note !== "string") {
    return undefined;
  }

  const said = plainText(declared.note, scope);

  return said === "" ? undefined : said;
}

/**
 * `aria-pressed`, and only when the move is genuinely a switch.
 *
 * A move that declares `to: toggle` has two states, and the one it is in is the
 * truth of whatever it sets or of whether its entry is written. A move that is
 * not a toggle gets no `aria-pressed` at all, because a button that reports a
 * pressed state it does not have is worse than one that reports nothing.
 */
function pressedBy(target: string, ctx: Ctx, scope: Scope): boolean | undefined {
  const declared = ctx.document.moves?.[target] as Record<string, unknown> | undefined;

  if (!declared || declared.to !== "toggle") {
    return undefined;
  }

  const sets = declared.sets;

  if (sets && typeof sets === "object" && !Array.isArray(sets)) {
    for (const name of Object.keys(sets as Record<string, unknown>)) {
      return truthy(readVariable(name, scope));
    }
  }

  const logs = declared.logs;

  if (logs && typeof logs === "object" && !Array.isArray(logs)) {
    for (const [log, written] of Object.entries(logs as Record<string, unknown>)) {
      const entries = scope.state.logs[log] ?? [];

      if (written && typeof written === "object" && !Array.isArray(written)) {
        const wanted = Object.entries(written as Record<string, unknown>).map(
          ([field, cell]) => [field, typeof cell === "string" ? plainText(cell, scope) : cell] as const
        );

        return entries.some((held) =>
          wanted.every(([field, value]) => (held as Record<string, unknown>)[field] === value)
        );
      }
    }
  }

  return undefined;
}

function readVariable(name: string, scope: Scope): Value {
  if (Object.prototype.hasOwnProperty.call(scope.state.variables, name)) {
    return scope.state.variables[name];
  }

  const declared: VariableDef | undefined = scope.variables[name];

  return declared ? declared.default : undefined;
}

/** The item a `:do{… item=…}` names, looked for wherever an item can be. */
function itemNamed(name: string, ctx: Ctx): GroupItem | undefined {
  const bound = ctx.scope.bindings[name];

  if (bound && typeof bound === "object" && !Array.isArray(bound)) {
    return bound as GroupItem;
  }

  // A bare word may also name an item of a group by its id, which is how one
  // move serves several spans in a paragraph with no loop around it.
  for (const group of Object.keys(ctx.document.groups ?? {})) {
    const found = resolveGroup(group, ctx.scope).value?.find((item) => item.id === name);
    if (found) return found;
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Exits                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The first of the two gates lives on the exit: "may I leave that way?".
 * Disappearing is what a false `when:` means here — the format says so, and says
 * why `once:` does not exist.
 */
function renderExits(node: NodeDef, ctx: Ctx): ReactNode {
  const open = node.exits.filter((exit) => canLeave(exit, ctx.scope));

  if (open.length === 0) {
    return null;
  }

  return (
    <ul className="calamus__exits">
      {open.map((exit: Exit, index: number) => (
        <li key={`exit.${index}`} className="calamus__exit">
          {affordanceElement(
            {
              key: `exit.${index}`,
              action: "go",
              target: exit.to,
              children: plainText(exit.label, ctx.scope),
              className: "calamus__exit-link",
              resets: exit.resets,
            },
            ctx,
            `exit.${index}`
          )}
          {exit.note ? <span className="calamus__exit-note"> {plainText(exit.note, ctx.scope)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A variable the reader may move.
 *
 * Ten of the nineteen label a control, and a label is prose someone reads, so it
 * goes through the phrase machinery like any other clause.
 *
 * `placement` is the author's word for where the control sits. One value is
 * load-bearing rather than decorative: `prose` means the author put the gesture
 * in the sentence — `redaction` writes three toggles that way and then writes
 * `:do{move=show-inside}` inside the line — so the library does **not** also
 * emit a panel control for it. Two controls over one variable is two places to
 * press for one effect, and that is a defect, not a convenience. Every other
 * placement lands in the panel and keeps the author's word as data.
 */
function renderControls(ctx: Ctx): ReactNode {
  const entries = Object.entries(ctx.document.variables ?? {}).filter(
    ([, declared]) => declared.control && declared.placement !== "prose"
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="calamus__controls" role="group" aria-label={ctx.document.title}>
      {entries.map(([name, declared]) => renderControl(name, declared, ctx))}
    </div>
  );
}

function renderControl(name: string, declared: VariableDef, ctx: Ctx): ReactNode {
  const id = domId(ctx, `control-${name}`);
  const label = declared.label ? plainText(declared.label, ctx.scope) : name;
  const value = readVariable(name, ctx.scope);

  const set = (next: Scalar | Scalar[]) => {
    const gesture = emptyGesture();
    gesture.moves.push({ kind: "set", name, value: next });
    ctx.onGesture(gesture);
  };

  const common = {
    className: "calamus__control",
    "data-placement": declared.placement,
    "data-control": declared.control,
  };

  if (declared.control === "range") {
    return (
      <div key={name} {...common}>
        <label className="calamus__control-label" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          type="range"
          className="calamus__control-range"
          min={declared.min}
          max={declared.max}
          step={declared.step}
          value={Number(isScalar(value) ? value : 0)}
          onChange={(event) => set(Number(event.currentTarget.value))}
        />
        {/* The unit is a length CSS needs, never a word in a sentence. */}
        <output className="calamus__control-value" htmlFor={id}>
          {`${asText(value)}${declared.unit ?? ""}`}
        </output>
      </div>
    );
  }

  if (declared.control === "toggle") {
    return (
      <div key={name} {...common}>
        <input
          id={id}
          type="checkbox"
          className="calamus__control-toggle"
          checked={truthy(value)}
          onChange={(event) => set(event.currentTarget.checked)}
        />
        <label className="calamus__control-label" htmlFor={id}>
          {label}
        </label>
      </div>
    );
  }

  if (declared.control === "text") {
    return (
      <div key={name} {...common}>
        <label className="calamus__control-label" htmlFor={id}>
          {label}
        </label>
        {declared.rows && declared.rows > 1 ? (
          <textarea
            id={id}
            className="calamus__control-text"
            rows={declared.rows}
            value={asText(value)}
            onChange={(event) => set(event.currentTarget.value)}
          />
        ) : (
          <input
            id={id}
            type="text"
            className="calamus__control-text"
            value={asText(value)}
            onChange={(event) => set(event.currentTarget.value)}
          />
        )}
      </div>
    );
  }

  return renderChoice(name, declared, label, value, set, ctx);
}

/**
 * A choice, from `of:` or from a group the author declared.
 *
 * Radio buttons rather than a `<select>`, because the options are usually
 * sentences — "as haunting", "as grief", "as fraud" — and because a group needs
 * a name that is the author's prose, which `aria-label` on the group carries.
 */
function renderChoice(
  name: string,
  declared: VariableDef,
  label: string,
  value: Value,
  set: (next: Scalar) => void,
  ctx: Ctx
): ReactNode {
  const options = optionsOf(declared, ctx);
  const group = domId(ctx, `control-${name}`);

  return (
    <div
      key={name}
      className="calamus__control"
      role="radiogroup"
      aria-label={label}
      data-placement={declared.placement}
      data-control={declared.control}
    >
      <span className="calamus__control-label">{label}</span>
      {options.map((option, index) => {
        const id = `${group}-${index}`;

        return (
          <span key={option.value} className="calamus__control-option">
            <input
              id={id}
              type="radio"
              name={group}
              checked={asText(value) === option.value}
              onChange={() => set(option.raw)}
            />
            <label htmlFor={id}>{option.label}</label>
          </span>
        );
      })}
    </div>
  );
}

type Option = { value: string; raw: Scalar; label: string };

/**
 * The options of a choice, and their labels.
 *
 * `of:` is the options themselves; `optionsFrom:` is a group the author
 * declared, which is what every document that takes its options from a group
 * writes. A label is prose: either one clause per option, or — the shape the
 * corpus actually writes — a **single clause read with the option bound**,
 * exactly as `PhraseDef.of` does, because a per-option map cannot label each
 * option with its own field.
 */
function optionsOf(declared: VariableDef, ctx: Ctx): Option[] {
  const labels = declared.optionLabels;

  const labelFor = (raw: Scalar, item: GroupItem | null): string => {
    const key = asText(raw);

    if (typeof labels === "string") {
      // One clause, read with the option bound under the schema's one accessor.
      return plainText(labels, itemScope(ctx.scope, item ?? ({ id: key } as GroupItem)));
    }

    if (labels && typeof labels === "object") {
      const said = labels[key];
      if (typeof said === "string") return plainText(said, ctx.scope);
    }

    return key;
  };

  if (declared.optionsFrom) {
    const found = resolveGroup(declared.optionsFrom, ctx.scope);
    ctx.diagnostics.push(...found.diagnostics);

    return (found.value ?? []).map((item) => {
      const raw = (item.id ?? "") as Scalar;
      return { value: asText(raw), raw, label: labelFor(raw, item) };
    });
  }

  return (declared.of ?? []).map((raw) => ({ value: asText(raw), raw, label: labelFor(raw, null) }));
}

/* -------------------------------------------------------------------------- */
/* Slots                                                                       */
/* -------------------------------------------------------------------------- */

function renderView(
  view: (ctx: SlotContext) => ReactNode,
  name: string,
  params: Record<string, unknown>,
  children: ReactNode,
  ctx: Ctx,
  path: string
): ReactNode {
  const instance = `${ctx.prefix}:${path}`;

  try {
    return view(slotContext(name, instance, params, children, ctx));
  } catch {
    // A registry entry is host code compiled into the page; the contract
    // prevents mistakes, not malice. One that throws must not take the reading
    // with it (decision 28).
    ctx.diagnostics.push({ severity: "warning", message: `the \`views\` entry \`${name}\` threw; its region printed its prose` });
    return children;
  }
}

/**
 * The one frozen argument a slot receives (contrato-ranuras §1.1).
 *
 * Projection, not access: `vars`, `items` and `bind` are what the island
 * declared and nothing else. The document, the graph, the paginator and
 * navigation are all absent, and their absence is the contract — a view that can
 * navigate is a hypertext in disguise, and a view that can read the paginator
 * makes pagination depend on its own result.
 */
function slotContext(
  name: string,
  instance: string,
  params: Record<string, unknown>,
  children: ReactNode,
  ctx: Ctx
): SlotContext {
  const writes = listOfStrings(params.writes);
  const vars: Record<string, SlotValue> = {};

  for (const variable of listOfStrings(params.vars)) {
    const value = readVariable(variable, ctx.scope);
    if (value !== undefined && (isScalar(value) || Array.isArray(value))) {
      vars[variable] = value as SlotValue;
    }
  }

  const items = typeof params.of === "string" ? (resolveGroup(params.of, ctx.scope).value ?? []) : [];

  const bind: Record<string, string> = {};

  if (params.bind && typeof params.bind === "object" && !Array.isArray(params.bind)) {
    for (const [role, field] of Object.entries(params.bind as Record<string, unknown>)) {
      if (typeof field === "string") bind[role] = field;
    }
  }

  const commit = (move: string, payload?: Record<string, Scalar>): boolean => {
    // Four fences, and none of them depends on the entry's good will: the pass,
    // the gesture, the authority list and the declaration.
    if (ctx.pass === "measure") return false;

    // "There is no write on mount." Not as a rule of style — a rule in a
    // document is broken by the first registry entry in a hurry — but because
    // outside a real press `commit` is inert and the author sees it not happen.
    if (!ctx.holder.inGesture()) {
      ctx.diagnostics.push({
        severity: "warning",
        message: `the slot \`${name}\` invoked \`${move}\` outside a gesture; the write was refused`,
      });
      return false;
    }

    if (!writes.includes(move)) {
      ctx.diagnostics.push({
        severity: "warning",
        message: `the slot \`${name}\` invoked \`${move}\`, which its \`writes:\` does not list; the write was refused`,
      });
      return false;
    }

    const declared = ctx.document.moves?.[move];

    if (!declared) {
      ctx.diagnostics.push({ severity: "warning", message: `the slot \`${name}\` invoked \`${move}\`, which the document does not declare` });
      return false;
    }

    const bound = payload ? itemScope(ctx.scope, payload as GroupItem) : ctx.scope;
    ctx.onGesture(gestureFor({ action: "do", target: move, from: instance }, ctx.document, bound));
    return true;
  };

  return Object.freeze<SlotContext>({
    name,
    instance,
    pass: ctx.pass,
    revision: ctx.revision,
    params: Object.freeze({ ...params }),
    bind: Object.freeze(bind),
    vars: Object.freeze(vars),
    items: Object.freeze(items.map((item) => Object.freeze({ ...item }))),
    children,
    lang: ctx.document.lang ?? "en",
    motion: ctx.motion,
    // `needs: [box]` is served by the library, never by an observer of the
    // slot's own: N observers inside a paginated surface is decision 19's loop
    // with one more boundary. Not yet served, so null, which a slot must render.
    box: null,
    affordance: (move, payload): AffordanceProps => ({
      type: "button",
      disabled: ctx.pass === "measure" || !writes.includes(move) ? true : undefined,
      onClick: ctx.pass === "measure" ? undefined : () => void commit(move, payload),
      "aria-label": declaredNote(move, ctx, ctx.scope),
      "aria-pressed": pressedBy(move, ctx, ctx.scope),
      "data-calamus-move": move,
    }),
    commit,
    announce: (phrase: string) => {
      // Only the name of a phrase of the document, never a string: what a slot
      // says goes through the library's one announcer, which already knows when
      // to keep quiet (decision 14b).
      const declared = ctx.document.phrases?.[phrase];

      if (!declared) {
        ctx.diagnostics.push({ severity: "warning", message: `the slot \`${name}\` asked to announce \`${phrase}\`, which is not a phrase of the document` });
        return;
      }

      const gesture = emptyGesture();
      gesture.announce = resolvePhrase(declared, { ...ctx.scope, phraseName: phrase });
      ctx.onGesture(gesture);
    },
    hold: (key, acquire, release) => ctx.holder.hold(instance, key, acquire, release),
  });
}

function listOfStrings(value: unknown): string[] {
  if (typeof value === "string") return value.split(/[,\s]+/).filter(Boolean);
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  return [];
}

/* -------------------------------------------------------------------------- */
/* Attributes, ids and plain text                                              */
/* -------------------------------------------------------------------------- */

/**
 * What a `:with` puts on the element it opened.
 *
 * `live` is deliberately **not** an `aria-live` here. The library owns every
 * live region (contrato-ranuras §5.2.2): the block's text is gathered into the
 * single hidden announcer, which stays empty until the reader's first real
 * gesture, because mounting renders and re-paginates and an element cannot tell
 * a measurement from an intention (decision 14b). The author's politeness is
 * kept as data so the announcer and the stylesheet can both see it.
 */
function attributesOf(
  attrs: BlockAttrs,
  ctx: Ctx,
  options: { withId?: boolean } = {}
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (attrs.lang) out.lang = attrs.lang;
  if (attrs.role) out["data-role"] = attrs.role;
  if (attrs.voice) out["data-voice"] = attrs.voice;
  if (attrs.mark) out["data-mark"] = attrs.mark;
  if (attrs.weight !== undefined) out["data-weight"] = attrs.weight;
  if (attrs.live) out["data-live"] = attrs.live === true ? "polite" : attrs.live;

  if ((options.withId ?? true) && attrs.id) {
    out.id = domId(ctx, plainText(attrs.id, ctx.scope));
  }

  return out;
}

/**
 * Every id this renderer emits is prefixed.
 *
 * The reader is embedded in somebody else's page, and an authored id like
 * `line` would otherwise shadow theirs. The prefix is also what lets two
 * readings of the same document sit on one page.
 */
export function domId(ctx: Pick<Ctx, "prefix">, id: string): string {
  return `${ctx.prefix}-${id}`;
}

function hasTemplate(value: string | undefined): boolean {
  return typeof value === "string" && value.indexOf("{") !== -1;
}

function isRevealable(id: string, ctx: Ctx): boolean {
  for (const template of ctx.revealable) {
    if (matchesTemplate(template, id)) return true;
  }

  return false;
}

/** The words of a block, for the announcer. Text, not markup, and not elements:
 *  what a screen reader would say if it read the block out. */
function textOf(content: Inline[], ctx: Ctx): string {
  return content
    .map((item) => {
      if (item.kind === "text") return item.text;
      if (item.kind === "interpolation") return plainText(`{${item.path}}`, ctx.scope);
      if ("children" in item) return textOf(item.children, ctx);
      return "";
    })
    .join("")
    .trim();
}

function textOfBlocks(blocks: Block[], ctx: Ctx): string {
  return blocks
    .map((block) => {
      if (block.kind === "paragraph" || block.kind === "heading") return textOf(block.content, ctx);
      if ("body" in block) return textOfBlocks(block.body, ctx);
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * A variable's live value as a CSS custom property.
 *
 * The arithmetic falls in CSS (decision 29 and contrato-ranuras §6), so what
 * crosses into the stylesheet is the value and its declared unit, and nothing
 * computed. This is the one place the renderer writes a string into an attribute
 * position that nothing downstream escapes for it, so `escapeAttribute` — the
 * one that takes quotes out, because a quote ends an attribute value — is the
 * right escape here, where `escapeText` would leave the quote standing.
 */
export function customProperties(document: NarrativeDocument, state: ReadingState): Record<string, string> {
  const properties: Record<string, string> = {};
  const scope = scopeFromDocument(document, state);

  for (const [name, declared] of Object.entries(document.variables ?? {})) {
    const value = Object.prototype.hasOwnProperty.call(state.variables, name)
      ? state.variables[name]
      : declared.default;

    if (value === undefined) continue;

    properties[`--calamus-var-${name}`] = markupAttribute(
      `${asText(value as Value)}${declared.unit ?? ""}`,
      scope
    );
  }

  return properties;
}
