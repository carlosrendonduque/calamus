---
title: The corridor and the two doors
lang: en
groups:
  doors:
    fields: [id, name]
    items:
      - { id: north, name: the north door }
      - { id: south, name: the south door }
  # Two logs, declared with the groups because a log is a group that grows.
  # Counting by appending, so nothing has to be added to anything.
  readings: { fields: [], keeps: duplicates, removes: none }
  chosen: { fields: [door], keeps: duplicates, removes: none }
# The example opens mid-reading on purpose: two readings already done and the
# north door already used. `readings:` gives the reading count a literal value so
# the author does not have to write two empty entries by hand.
opens:
  readings: 2
  logs:
    chosen: [{ door: north }]
moves:
  # The gesture names itself; what it writes is declared once, here.
  go-through:
    writes: [chosen]
    logs: { chosen: { door: "{item.id}" } }
names:
  readings-so-far: count(readings)
  doors-opened: count(chosen)
  last-door: last(chosen).door
  other-door: first(doors where not id == last-door.id)
  times-here: count(chosen where door == last-door)
  times-other: count(chosen where door == other-door)
phrases:
  opening:
    on: readings-so-far
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
  this-door:
    on: times-here
    cases:
      - { is: 1, say: once }
      - { say: "{times-here} times" }
  that-door:
    on: times-other
    cases:
      - { is: 0, say: not at all }
      - { is: 1, say: once }
      - { say: "{times-other} times" }
  where-you-went:
    cases:
      - when: "doors-opened == 0"
        say: >-
          Neither door has been opened yet, which is the only reason this
          sentence is still polite.
      - say: >-
          You went through {last-door.name} last, and you have gone through it
          {this-door}. The other door has been used {that-door}.
  tally:
    say: "Readings: {readings-so-far}. Doors opened: {doors-opened}."
---

{opening}

{where-you-went}

:each{of=doors}
:do[Go through {item.name}]{move=go-through}

:with{live=status}
{tally}

```calamus
controls:
  - logs: { readings: {} }
    label: Read it again
  # Not back to `opens:`, which is two readings, and not to nothing either: the
  # component forgets down to one reading. A reset needs a literal target.
  - resets: { readings: 1, chosen: [] }
    label: Forget me
    when: "readings-so-far > 1 or doors-opened > 0"
```
