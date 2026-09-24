---
title: One hour, kept twice
calamus: 1
lang: en
groups:
  minutes:
    fields: [time, gate, warden, agrees]
    items:
      - time: "03:14"
        gate: Door six opened.
        warden: Nothing to report.
        agrees: false
      - time: "03:16"
        gate: Lights on in the yard.
        warden: Lights on in the yard.
        agrees: true
      - time: "03:17"
        gate: A metal sound, twice.
        warden: Wind in the duct, as it is most nights.
        agrees: false
      - time: "03:22"
        gate: Signal lost.
        warden: Equipment working normally.
        agrees: false
  shown: { of: minutes, where: not agrees or not only-disputed }
  split: { of: minutes, where: not agrees }
variables:
  only-disputed:
    type: boolean
    default: false
    control: toggle
    label: Only the minutes they dispute
names:
  showing: count(shown)
  total: count(minutes)
  disputed: count(split)
phrases:
  verdict:
    cases:
      - when: item.agrees
        say: agreed
      - say: disputed
  tally:
    say: >-
      Showing {showing} of {total} minutes. The two logs disagree about
      {disputed} of them.
---

```calamus
each: shown
as: rows
split-when: not item.agrees
```

{item.time} — {verdict}

Gate log. {item.gate}

Night warden. {item.warden}

```calamus
end
```

:with{live=polite}
{tally}
