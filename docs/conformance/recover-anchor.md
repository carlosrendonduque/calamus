---
title: The bridge was passed as sound
calamus: 1
lang: en
groups:
  anchors:
    fields: [id, label, text]
    items:
      - id: note
        label: note 4.2
        text: The pier was gauged twice that morning, and the figures differ.
      - id: appendix
        label: appendix C
        text: The figure that was filed is in a hand nobody will own.
logs:
  jumps:
    fields: [anchor, direction]
    append-only: true
variables:
  away: { type: enum, of: anchors, blank: true, default: blank }
moves:
  down-note:
    focus: body-note
    set: { away: note }
    add: { jumps: { anchor: note, direction: down } }
  down-appendix:
    focus: body-appendix
    set: { away: appendix }
    add: { jumps: { anchor: appendix, direction: up } }
  back:
    focus: "mark-{away}"
    set: { away: blank }
    add: { jumps: { anchor: away, direction: up } }
  re-anchor:
    focus: main
    set: { away: blank }
    resets: jumps
names:
  moves: count(jumps)
phrases:
  where:
    cases:
      - when: away
        say: You are in {away.label}, off the main line.
      - when: moves == 0
        say: "The main line is stable: you have not left it yet."
      - say: Back on the main line. The log keeps every move you made.
  move:
    cases:
      - when: entry.direction == down
        say: down to {entry.anchor.label}
      - say: up from {entry.anchor.label}
---

:with{id=main focus=yes}
The bridge was passed as sound on the fourteenth
:do[note 4.2]{move=down-note id=mark-note} on a sheet the engineer of record
never read :do[appendix C]{move=down-appendix id=mark-appendix} and it has
carried the mail every day since.

```calamus
each: anchors
as: apparatus
id: body-{item.id}
focus: yes
```

#### {item.label}

{item.text}

```calamus
end
```

:with{live=polite}
{where}

```calamus
each: jumps
as: steps
current: last
live: polite
```

{move}

```calamus
end
```

:do[Back to the line you left]{move=back when="away"}
:do[Re-anchor the reading]{move=re-anchor when="moves > 0"}
