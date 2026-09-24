---
title: Two accounts of one night
calamus: 1
lang: en
groups:
  points:
    fields: [id, subject, transcript, log]
    items:
      - id: hour
        subject: The hour
        transcript: The call reached the desk at twenty past three.
        log: "I made the call at ten to four, from the gate, and not before."
      - id: wall
        subject: The wall
        transcript: The wall of the store room had moved out by about a hand's width.
        log: >-
          Nothing in the store room had moved. I said so at the time and I say so
          here.
      - id: signal
        subject: The signal
        transcript: "We were off the radio for four minutes, perhaps five."
        log: The radio worked all night. Nobody called me on it.
variables:
  marked:
    type: enum
    of: points
    default: ""
    control: choice
    control-label: Line the two accounts up on one point
    option-label: "{item.subject}"
    clears: true
marks:
  # The condition belongs to the mark, not to the paragraph: `when` on a
  # paragraph decides whether the paragraph is there at all, and this line is
  # always there. A mark is evaluated in the scope of the thing that carries
  # it, so `item` is the row being printed.
  subject: { as: label }
  disputed:
    as: rule
    when: "item.id == marked"
    note: the point you marked
names:
  # Not `point`: `marks:`, `names:`, `groups:` and `variables:` share one
  # namespace, because `{point}` in prose cannot say which of them it meant.
  on-point: first(points where id == marked)
phrases:
  verdict:
    cases:
      - when: "marked"
        say: >-
          {on-point.subject}: marked in both accounts, which do not agree
          about it.
      - say: Mark a point to find it in both columns.
---

```calamus
pair: accounts
```

```calamus
each: points
as: column
label: Transcript of the call
heading: Transcript of the call
```

:with{mark=disputed}
:mark[{item.subject}]{as=subject} {item.transcript}

```calamus
end
```

```calamus
each: points
as: column
label: "Field log, same night"
heading: "Field log, same night"
```

:with{mark=disputed}
:mark[{item.subject}]{as=subject} {item.log}

```calamus
end
```

```calamus
end
```

:with{live=status}
{verdict}
