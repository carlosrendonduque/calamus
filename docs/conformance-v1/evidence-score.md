---
title: How reliable is the account
calamus: 1
lang: en
groups:
  # `floor` is the reliability at which a clause may be stated plainly; below
  # `keep` it is not said at all. Both are the author's field names, and both are
  # compared against a variable, which is what keeps this out of arithmetic.
  account:
    fields: [plain, hedged, floor, keep]
    items:
      - plain: The door was locked from the inside.
        hedged: The door is described as having been locked from the inside.
        floor: 70
        keep: 0
      - plain: The clerk turned the visitor away at eleven.
        hedged: >-
          Someone, probably the clerk, turned a visitor away late in the evening.
        floor: 45
        keep: 15
      - plain: The register gives the visitor's name in full.
        hedged: "The register gives a name, in a hand that is not the clerk's."
        floor: 80
        keep: 35
  said: { of: account, where: "trust >= keep" }
  plainly: { of: account, where: "trust >= keep and trust >= floor" }
marks:
  # The mark is the hedging, so its condition is the same comparison the phrase
  # makes, evaluated in the scope of the clause being printed.
  hedged: { as: hedge, when: "not trust >= item.floor" }
variables:
  trust:
    type: number
    min: 0
    max: 100
    step: 1
    default: 72
    unit: "%"
    control: range
    control-at: panel
    label: reliability
names:
  surviving: count(said)
  total: count(account)
  asserted: count(plainly)
phrases:
  # One clause, two drafts, chosen by comparing a variable against a field of the
  # clause being printed. The phrase has to be able to see that clause.
  clause:
    of: item
    cases:
      - { when: "trust >= item.floor", say: "{item.plain}" }
      - { say: "{item.hedged}" }
  survival:
    on: surviving
    cases:
      - is: 1
        say: >-
          1 of {total} claims survives at this reliability; {asserted} are stated
          without hedging.
      - say: >-
          {surviving} of {total} claims survive at this reliability; {asserted}
          are stated without hedging.
---

The dial does not tint the page or add a badge: it changes the verbs. Drag it
down and the account stops asserting, then stops mentioning. Each claim has its
own threshold, so the paragraph degrades unevenly, the way a file does.

Reliability: {trust}%

```calamus
each: said
live: polite
```

:with{mark=hedged}
{clause}

```calamus
end
```

:with{live=polite}
{survival}
