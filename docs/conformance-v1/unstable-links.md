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
  # The turnings still open are the ones not in the log. The pivot arithmetic of
  # the component is not authored content: what is authored is that the order is
  # unstable, which is a name the registry resolves.
  left: { of: turns, where: "not in(taken, item)" }
marks:
  turn-name: { as: label }
logs:
  taken: { fields: [name, line], keeps: duplicates, removes: none }
names:
  remaining: count(left)
phrases:
  turnings-left:
    on: remaining
    cases:
      - when: "remaining == 0"
        say: >-
          Nothing is left to take. The paragraph above is the orchard in the
          order you made.
      - { is: 1, say: 1 turning left, and not where you last saw it. }
      - say: "{remaining} turnings left, and not where you last saw them."
  # The component joins with ", " throughout and never reaches for a
  # conjunction, so `last:` is absent rather than defaulted.
  closed-behind:
    list: taken
    field: name
    sep: ", "
    cases:
      - { when: "count(taken) == 0", say: "" }
      - { say: "Closed behind you: {closed-behind.list}." }
---

Five ways out of the orchard. Take one and it closes behind you, and the ones
you did not take change places while you are reading, so the same turning is
never twice in the same spot.

```calamus
each: taken
live: polite
empty: You are standing in the middle of the trees, and every way out is still open.
```

:mark[{entry.name}.]{as=turn-name} {entry.line}

```calamus
end
```

```calamus
each: left
order: unstable
```

:log[Go by {item.name}]{add=taken name="{item.name}" line="{item.line}"}

```calamus
end
```

:with{live=status}
{turnings-left}

{closed-behind}

```calamus
controls:
  - resets: taken
    label: Put the orchard back
    when: "count(taken) > 0"
```
