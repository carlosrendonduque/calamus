---
title: Hold them together
lang: en
groups:
  claims:
    fields: [id, about]
    items:
      - { id: door, about: whether the door was open at three }
      - { id: entry, about: whether anything was entered after three }
  statements:
    fields: [id, text, claim, holds]
    items:
      - { id: s1, text: The main door was sealed at three o'clock., claim: door, holds: false }
      - { id: s2, text: At two minutes past three the main door still stood open., claim: door, holds: true }
      - { id: s3, text: No opening was recorded after that hour., claim: entry, holds: false }
      - { id: s4, text: The register carries one entry timed at half past three., claim: entry, holds: true }
  chosen: { of: statements, where: "in(held, item)" }
  # A log is a group that grows, so it is declared here with the rest. A checkbox
  # comes off again, so this one removes by identity and not by being the last
  # one written.
  held: { fields: [statement], keeps: unique, removes: any }
marks:
  clash: { as: highlight, note: these will not hold together }
names:
  # Grouped before it is quantified: `split` asks whether one claim has been
  # answered both ways, not whether two answers of opposite sign exist anywhere.
  broken:
    over: chosen
    by: claim
    test: split
  holding: count(chosen)
  clashes: count(broken)
moves:
  # One gesture that both writes and unwrites, which is what a checkbox is.
  hold:
    writes: [held]
    logs: { held: { statement: "{item.id}" } }
    to: toggle
    control: checkbox
phrases:
  # The component joins with ", and " at every join, so "A, and B" is what it
  # prints and both separators say the same thing.
  both-ways:
    list: { of: broken, field: claim.about, sep: ", and ", last: ", and " }
    cases:
      - say: "{both-ways.list}"
  verdict:
    on: clashes
    cases:
      - when: "clashes > 0"
        say: Cannot all stand. Your selection answers {both-ways} both ways.
      - when: "holding < 2"
        say: >-
          Hold two statements at once and see whether the file can keep them
          both.
      - say: These {holding} can stand together.
---

:each{of=statements}
:do[{item.text}]{move=hold}

:with{live=status mark=clash}
{verdict}

```calamus
controls:
  - resets: held
    label: Let them all go
    when: "count(held) > 0"
```
