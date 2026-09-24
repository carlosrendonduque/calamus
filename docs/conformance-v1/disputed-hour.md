---
title: One hour, kept twice
lang: en
groups:
  minutes:
    fields: [time, gate, warden, agrees]
    items:
      - { id: m14, time: "03:14", gate: Door six opened., warden: Nothing to report., agrees: false }
      - { id: m16, time: "03:16", gate: Lights on in the yard., warden: Lights on in the yard., agrees: true }
      - { id: m17, time: "03:17", gate: "A metal sound, twice.", warden: "Wind in the duct, as it is most nights.", agrees: false }
      - { id: m22, time: "03:22", gate: Signal lost., warden: Equipment working normally., agrees: false }
  # No conditional needed: the filter is off when the variable is off.
  shown: { of: minutes, where: "not agrees or not only-disputed" }
variables:
  only-disputed:
    type: boolean
    default: false
    control: toggle
    control-at: panel
    label: Only the minutes they dispute
names:
  showing: count(shown)
  kept: count(minutes)
  split: count(minutes where not agrees)
phrases:
  verdict:
    of: item
    cases:
      - { when: "item.agrees", say: agreed }
      - { say: disputed }
  tally:
    on: showing
    cases:
      - is: 1
        say: >-
          Showing 1 of {kept} minutes. The two logs disagree about {split} of
          them.
      - say: >-
          Showing {showing} of {kept} minutes. The two logs disagree about
          {split} of them.
---

```calamus
each: shown
```

:with{role=time}
{item.time} — {verdict}

{item.gate}

{item.warden}

```calamus
end
```

:with{live=status}
{tally}
