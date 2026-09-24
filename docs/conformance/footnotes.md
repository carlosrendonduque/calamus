---
title: They had agreed to meet in the evening
calamus: 1
lang: en
groups:
  notes:
    fields: [mark, text, child]
    items:
      - mark: "1"
        text: The word evening is doing a great deal of work in that sentence.
        child: "1.1"
      - mark: "1.1"
        text: It was, strictly speaking, still the afternoon.
        child: "1.1.a"
      - mark: "1.1.a"
        text: The clock in the hall had been ten minutes wrong for a decade.
        child: "1.1.a.i"
      - mark: "1.1.a.i"
        text: Nobody tall enough to reach it had ever been told.
logs:
  chain:
    fields: [note]
    append-only: false
names:
  depth: count(chain)
  total: count(notes)
  open: last(chain)
phrases:
  status:
    cases:
      - when: depth == 0
        say: Nothing opened yet. The chain is four notes deep.
      - say: "Depth {depth} of {total}: note {open.note}."
---

They had agreed to meet in the evening
:log[1]{add=chain note="1" once=true} , and only one of them arrived.

```calamus
each: chain
as: steps
indent: step
```

{entry.note.mark} {entry.note.text}

:with{when="entry == open and entry.note.child"}
:log[{entry.note.child}]{add=chain note="{entry.note.child}"}

```calamus
end
```

:with{live=polite}
{status}

:log[Back up one note]{in=chain drop=last when="depth > 0"}
:do[Close the chain]{resets=chain when="depth > 0"}
