---
title: The account, at the reliability you allow it
calamus: 1
lang: en
variables:
  trust:
    type: number
    min: 0
    max: 100
    step: 1
    default: 72
    unit: "%"
    control: range
    label: reliability
groups:
  account:
    fields: [plain, hedged, floor, keep]
    items:
      - plain: The door was locked from the inside.
        hedged: >-
          The door is described as having been locked from the inside.
        floor: 70
        keep: 0
      - plain: The clerk turned the visitor away at eleven.
        hedged: >-
          Someone, probably the clerk, turned a visitor away late in the
          evening.
        floor: 45
        keep: 15
      - plain: The register gives the visitor's name in full.
        hedged: >-
          The register gives a name, in a hand that is not the clerk's.
        floor: 80
        keep: 35
  said: { of: account, where: trust >= keep }
  stated: { of: said, where: trust >= floor }
names:
  surviving: count(said)
  total: count(account)
  plain: count(stated)
phrases:
  clause:
    cases:
      - when: trust >= item.floor
        say: "{item.plain}"
      - say: "{item.hedged}"
  tally:
    say: >-
      {surviving} of {total} claims survive at this reliability; {plain} are
      stated without hedging.
---

```calamus
each: said
as: account
live: polite
temper: trust >= item.floor
```

{clause}

```calamus
end
```

{tally}

The dial does not tint the page or add a badge: it changes the verbs. Drag it
down and the account stops asserting, then stops mentioning. Each claim has its
own threshold, so the paragraph degrades unevenly, the way a file does.
