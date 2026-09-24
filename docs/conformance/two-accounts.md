---
title: One night, kept twice
calamus: 1
lang: en
groups:
  points:
    fields: [id, subject]
    items:
      - { id: hour, subject: The hour }
      - { id: wall, subject: The wall }
      - { id: signal, subject: The signal }
  transcript:
    fields: [point, text]
    items:
      - point: hour
        text: The call reached the desk at twenty past three.
      - point: wall
        text: The wall of the store room had moved out by about a hand's width.
      - point: signal
        text: We were off the radio for four minutes, perhaps five.
  log:
    fields: [point, text]
    items:
      - point: hour
        text: I made the call at ten to four, from the gate, and not before.
      - point: wall
        text: >-
          Nothing in the store room had moved. I said so at the time and I say so
          here.
      - point: signal
        text: The radio worked all night. Nobody called me on it.
variables:
  marked:
    type: enum
    of: points
    blank: true
    default: blank
    control: choice
    control-label: Line the two accounts up on one point
    option-label: "{item.subject}"
    clears: yes
marks:
  subject: { as: strong }
  found: { as: mark, note: the point you marked }
phrases:
  verdict:
    cases:
      - when: marked
        say: >-
          {marked.subject}: marked in both accounts, which do not agree about it.
      - say: Mark a point to find it in both columns.
---

```calamus
pair: accounts
```

```calamus
each: transcript
as: account
label: Transcript of the call
```

#### Transcript of the call

:with{when="item.point == marked" mark=found}
:mark[{item.point.subject}]{kind=subject} {item.text}

```calamus
each: log
as: account
label: Field log, same night
```

#### Field log, same night

:with{when="item.point == marked" mark=found}
:mark[{item.point.subject}]{kind=subject} {item.text}

```calamus
end
```

:with{live=polite}
{verdict}
