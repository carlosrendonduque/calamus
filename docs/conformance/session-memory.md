---
title: A line for your next visit
calamus: 1
lang: en
variables:
  note:
    type: string
    default: >-
      Left on an earlier visit: the stairs are counted differently going down.
    persist: visit
    control: text
    label: A line for your next visit
    rows: 3
phrases:
  kept:
    cases:
      - when: note
        say: >-
          The text has kept one sentence about you: "{note}" It survives closing
          the tab.
      - say: >-
          The text is keeping nothing about you. Write a line and it will
          outlive the page.
---

:with{live=polite}
{kept}

Reload the page. The reader-memory example forgets, because its state lives in
the reading; this one is declared as kept between visits, so the sentence comes
back with it.
