---
title: A line for your next visit
lang: en
variables:
  note:
    type: string
    # What the box holds when nothing has ever been written in it. The contract
    # asks every variable for one, and the seeded first line is a different
    # thing, so it goes under `opens:`.
    default: ""
    persist: true
    control: text
    control-at: panel
    label: A line for your next visit
    rows: 3
# Seeded on a first visit, because a blank box cannot show that anything is kept.
opens:
  variables:
    note: >-
      Left on an earlier visit: the stairs are counted differently going down.
phrases:
  kept:
    on: note
    cases:
      # `persisted()` is an operator, not a name: the third branch is a fact
      # about the browser, and this is the one document whose subject is being
      # honest about the medium.
      - when: "not persisted()"
        say: >-
          This browser will not store anything, so nothing written here can
          outlive the page.
      - when: "note == \"\""
        say: >-
          The text is keeping nothing about you. Write a line and it will outlive
          the page.
      - say: >-
          The text has kept one sentence about you: "{note}" It survives closing
          the tab.
---

:with{live=polite}
{kept}

```calamus
controls:
  - sets: { note: control }
    label: Keep this
    when: "persisted()"
  - sets: { note: "" }
    label: Make it forget
    when: "not note == \"\""
```

Reload the page. The reader-memory example forgets, because its state lives in
the page; this one is written down as it is read, so the sentence comes back
with it.
