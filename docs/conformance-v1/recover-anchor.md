---
title: The bridge was passed as sound
lang: en
groups:
  anchors:
    fields: [id, label, text]
    items:
      - { id: note, label: note 4.2, text: "The pier was gauged twice that morning, and the figures differ." }
      - { id: appendix, label: appendix C, text: The figure that was filed is in a hand nobody will own. }
  # A log is a group that grows.
  jumps: { fields: [way, anchor], keeps: duplicates, removes: none }
variables:
  away: { type: string, default: "" }
names:
  moved: count(jumps)
  gone: first(anchors where id == away)
moves:
  # One gesture, three effects: the focus moves to the apparatus, a variable
  # records that the reader is off the main line, and the log grows.
  down-to:
    writes: [away, jumps]
    show: "anchor-body-{item.id}"
    focus: true
    sets: { away: "{item.id}" }
    logs: { jumps: { way: down, anchor: "{item.id}" } }
  back-up:
    writes: [away, jumps]
    show: "anchor-mark-{away}"
    focus: true
    sets: { away: "" }
    logs: { jumps: { way: up, anchor: "{away}" } }
  re-anchor:
    writes: [away, jumps]
    show: anchor-main
    focus: true
    sets: { away: "" }
    resets: jumps
phrases:
  # The log prints a sentence per entry, so the entry is the phrase's subject.
  jump-line:
    of: item
    cases:
      - { when: "item.way == down", say: "down to {item.anchor.label}" }
      - { say: "up from {item.anchor.label}" }
  where-you-are:
    cases:
      - { when: "away", say: "You are in {gone.label}, off the main line." }
      - { when: "moved == 0", say: "The main line is stable: you have not left it yet." }
      - { say: Back on the main line. The log keeps every move you made. }
---

```calamus
block: line
id: anchor-main
```

The bridge was passed as sound on the fourteenth
:do[note 4.2]{move=down-to item=note id=anchor-mark-note} on a sheet the
engineer of record never read
:do[appendix C]{move=down-to item=appendix id=anchor-mark-appendix} and it
has carried the mail every day since.

```calamus
end
```

```calamus
each: anchors
as: apparatus
id: anchor-body-{item.id}
label: "{item.label}"
```

:with{role=heading}
{item.label}

{item.text}

```calamus
end
```

:with{live=polite}
{where-you-are}

```calamus
each: jumps
label: Where you have been
current: last(jumps)
```

{jump-line}

```calamus
end
```

```calamus
controls:
  - move: back-up
    label: Back to the line you left
    when: "away"
  - move: re-anchor
    label: Re-anchor the reading
    when: "moved > 0"
```
