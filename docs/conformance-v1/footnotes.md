---
title: They had agreed to meet in the evening
lang: en
groups:
  notes:
    fields: [id, mark, text, child]
    items:
      - { id: n1,   mark: "1",       text: The word evening is doing a great deal of work in that sentence., child: n11 }
      - { id: n11,  mark: "1.1",     text: "It was, strictly speaking, still the afternoon.", child: n11a }
      - { id: n11a, mark: "1.1.a",   text: The clock in the hall had been ten minutes wrong for a decade., child: n11ai }
      - { id: n11ai, mark: "1.1.a.i", text: Nobody tall enough to reach it had ever been told. }
  # A log is a group that grows. A chain, not a book: backing up one note takes
  # the last entry off again.
  chain: { fields: [note], keeps: unique, removes: last }
marks:
  note-number: { as: label }
  note-mark:   { as: reference }
names:
  depth: count(chain)
  total: count(notes)
  current: last(chain).note
  next-note: first(notes where id == current.child)
moves:
  # Three effects in one gesture: empty the chain, put note 1 on it, carry the
  # focus. No single inline verb can do all three.
  open-note-one:
    writes: [chain]
    resets: chain
    logs: { chain: { note: n1 } }
    focus: chain
  open-next:
    writes: [chain]
    logs: { chain: { note: "{next-note.id}" } }
    focus: chain
phrases:
  depth-line:
    on: depth
    cases:
      - when: "depth == 0"
        say: Nothing opened yet. The chain is four notes deep.
      - say: "Depth {depth} of {total}: note {current.mark}."
---

They had agreed to meet in the evening
:mark[:do[1]{move=open-note-one}]{kind=note-mark}, and only one of them arrived.

```calamus
each: chain
step: --step
```

:mark[{item.note.mark}]{kind=note-number} {item.note.text}

:with{when="item == last(chain) and item.note.child"}
:mark[:do[{next-note.mark}]{move=open-next}]{kind=note-mark}

```calamus
end
```

:with{live=status}
{depth-line}

```calamus
controls:
  - move: { removes: chain }
    label: Back up one note
    when: "depth > 0"
  - resets: chain
    label: Close the chain
    when: "depth > 0"
```
