---
title: Three sheets in one envelope
lang: en
groups:
  exhibits:
    fields: [id, title, body]
    items:
      - id: A
        title: Exhibit A, site note, 3 March
        body: >-
          The boundary wall stands four metres and ten from the gatepost.
          Measured twice, in company.
      - id: B
        title: Exhibit B, letter to the council, 19 March
        body: >-
          There is no wall on that side of the plot, and there has been none in
          my lifetime.
      - id: C
        title: Exhibit C, transcript, 2 April
        body: >-
          — We took it down in April. — Which April? — That is the question the
          file keeps asking.
  # `unique:` is the whole point of this log: "2 of 3 sheets opened" is wrong the
  # moment the same sheet counts twice, and a log keeps duplicates by contract.
  read: { fields: [sheet], keeps: unique, removes: none }
variables:
  open: { type: string, default: A }
opens:
  logs:
    read: [{ sheet: A }]
marks:
  opened: { as: note }
names:
  seen: count(read)
  total: count(exhibits)
  next-unread: first(exhibits where not in(read, item))
  showing: first(exhibits where id == open)
moves:
  turn-to:
    writes: [open, read]
    sets: { open: "{item.id}" }
    logs: { read: { sheet: "{item.id}" } }
    to: toggle
  turn-to-next:
    writes: [open, read]
    sets: { open: "{next-unread.id}" }
    logs: { read: { sheet: "{next-unread.id}" } }
phrases:
  sheet-count:
    on: seen
    cases:
      - { is: 1, say: "1 of {total} sheets opened." }
      - { say: "{seen} of {total} sheets opened." }
  state:
    cases:
      - { when: "open", say: "{showing.title} is open. {sheet-count}" }
      - { say: "The envelope is shut. {sheet-count}" }
---

Three sheets came in one envelope, with the first already on top. They do not
agree with each other, and nothing in the file says which of them was ever read.

```calamus
each: exhibits
reveal: one
```

:do[{item.title}]{move=turn-to}:mark[opened]{kind=opened when="in(read, item)"}

:with{when="open == item.id"}
{item.body}

```calamus
end
```

:with{live=status}
{state}

```calamus
controls:
  - sets: { open: "" }
    label: Shut the envelope
    when: "open"
  - move: turn-to-next
    label: Open the next unread sheet
    when: "seen < total"
```
