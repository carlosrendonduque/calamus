---
title: Two walks of the same town
calamus: 1
lang: en
start: quay
variables:
  kept: { type: list, of: trail, default: [] }
  picked: { type: list, of: kept, max: 2, control: choice }
nodes:
  quay: { title: the quay }
  market: { title: the market }
  light: { title: the light }
moves:
  keep:
    add: { kept: { name: "Route {count(kept)}", route: trail } }
    resets: trail
names:
  walks: count(kept)
phrases:
  waiting:
    on: walks
    cases:
      - say: "Walks kept: {walks}. Pick two."
---

Walk the town, keep the walk, then walk it another way and hold the two up
against each other.

```calamus
node: quay
exits:
  - to: market
    label: Go to the market
  - to: light
    label: Go to the light
  - to: quay
    label: Go to the quay
```

```calamus
each: trail
as: steps
label: The walk you are on
live: polite
```

{entry.title}

```calamus
end
```

:do[Keep this walk]{move=keep when="count(trail) > 0"}

:with{when="count(picked) < 2"}
{waiting}

```calamus
slot: route-compare
of: picked
naming: [name, route]
```

The two walks are held here side by side, step against step, and the page names
where they stopped agreeing.
