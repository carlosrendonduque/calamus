---
title: Walk the town twice
calamus: 1
lang: en
# Not a document. Four things are missing and none of them is a missing key:
# saved trails as values, a selection of two of them, a positional comparison of
# two lists, and the index of the first divergence — which is also the one
# arithmetic site in the nineteen that does not dissolve (`part + 1`). The part
# that is a document is written out; the part that is not is a slot, and this is
# the example with which the write-back contract has to be designed.
groups:
  nodes:
    fields: [name]
    items:
      - { name: the quay }
      - { name: the market }
      - { name: the light }
logs:
  route: { fields: [node], keeps: duplicates, removes: none }
names:
  walked: count(route)
  kept: count(saved)
phrases:
  kept-so-far:
    on: kept
    cases:
      - { say: "Walks kept: {kept}. Pick two." }
---

Walk the town, keep the walk, then walk it another way and hold the two up
against each other.

```calamus
each: nodes
```

:log[Go to {item.name}]{add=route node="{item.name}"}

```calamus
end
```

```calamus
each: route
label: The walk you are on
live: polite
current: last(route)
```

{entry.node}

```calamus
end
```

```calamus
slot: compare-routes
# Everything below the line is outside the schema. `saved` is a list of logs,
# which is a value the format has no way to hold; `picked` is a selection of two
# of them; the comparison is positional; and the slot has to write `saved` back
# into the document when the reader keeps a walk.
writes: [saved, picked]
reads: [route]
label: Keep this walk, then pick two
```

:with{live=status}
{kept-so-far}
