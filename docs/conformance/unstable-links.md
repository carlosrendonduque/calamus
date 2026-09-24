---
title: Five ways out of the orchard
calamus: 1
lang: en
groups:
  turns:
    fields: [name, line]
    items:
      - name: the gap in the hedge
        line: The field beyond has been mown since you last looked at it.
      - name: the pump house
        line: Unlocked, and the water still moving somewhere under the floor.
      - name: the low wall
        line: Someone has set the copings back in the wrong order.
      - name: the line of hives
        line: Quiet, and the quiet has plainly been arranged.
      - name: the gate off the map
        line: >-
          Which is how you know the map was drawn by someone who came this way
          twice.
  left:
    of: turns
    where: not in(taken)
    order: unstable
logs:
  taken:
    fields: [turn]
    append-only: true
names:
  remaining: count(left)
  gone: count(taken)
phrases:
  remaining:
    on: remaining
    cases:
      - is: 0
        say: >-
          Nothing is left to take. The paragraph above is the orchard in the
          order you made.
      - is: 1
        say: 1 turning left, and not where you last saw it.
      - say: "{remaining} turnings left, and not where you last saw them."
  closed:
    list: taken
    field: turn.name
    sep: ", "
    cases:
      - is: 0
        say: ""
      - say: "Closed behind you: {list}."
---

Five ways out of the orchard. Take one and it closes behind you, and the ones
you did not take change places while you are reading, so the same turning is
never twice in the same spot.

:with{when="gone == 0" live=polite}
You are standing in the middle of the trees, and every way out is still open.

```calamus
each: taken
live: polite
```

:mark[{entry.turn.name}.]{kind=named} {entry.turn.line}

```calamus
each: left
as: choices
```

:log[Go by {item.name}]{add=taken turn="{item}"}

```calamus
end
```

:with{live=polite}
{remaining}

{closed}

:do[Put the orchard back]{resets=taken when="gone > 0"}
