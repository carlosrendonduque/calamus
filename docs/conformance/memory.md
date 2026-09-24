---
title: The corridor and the two doors
calamus: 1
lang: en
groups:
  doors:
    fields: [door]
    items:
      - { door: the north door }
      - { door: the south door }
logs:
  readings:
    fields: []
    starts: 2
  opened:
    fields: [door]
    append-only: true
    starts: [{ door: the north door }]
names:
  readings: count(readings)
  chosen: count(opened)
  last: last(opened).door
  again: count(opened where door == last)
  other: count(opened where door != last)
phrases:
  opening:
    on: readings
    cases:
      - is: 1
        say: >-
          You have just arrived, so the paragraph introduces itself. There is a
          corridor, and at the end of the corridor there are two doors.
      - is: 2
        say: >-
          You have read this once already. The corridor is shorter this time,
          and the paragraph takes the doors as given.
      - is: 3
        say: >-
          Third reading. The corridor is gone. Only the doors are left, and they
          are the only thing worth describing.
      - say: >-
          You keep coming back. The paragraph has stopped describing anything at
          all and is simply counting you.
  again:
    on: again
    cases:
      - is: 1
        say: 1 time
      - say: "{again} times"
  other:
    on: other
    cases:
      - is: 1
        say: 1 time
      - say: "{other} times"
  doorcount:
    cases:
      - when: chosen == 0
        say: >-
          Neither door has been opened yet, which is the only reason this
          sentence is still polite.
      - say: >-
          You went through {last} last, and you have gone through it {again}.
          The other door has been used {other}.
  tally:
    say: "Readings: {readings}. Doors opened: {chosen}."
---

{opening}

{doorcount}

:log[Read it again]{add=readings}

```calamus
each: doors
as: choices
```

:log[Go through {item.door}]{add=opened door="{item.door}"}

```calamus
end
```

:with{live=polite}
{tally}

:do[Forget me]{resets="readings, opened" when="readings > 1 or chosen > 0"}
