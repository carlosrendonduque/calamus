---
title: The clerk's report
lang: en
# Three spans, three variables, three phrases. The three phrases differ only in
# the name they dispatch on: the label belongs to the span, and a phrase has no
# way to take the span as an argument.
variables:
  inside:   { type: boolean, default: false, control: toggle, control-at: prose }
  address:  { type: boolean, default: false, control: toggle, control-at: prose }
  page-two: { type: boolean, default: false, control: toggle, control-at: prose }
marks:
  withheld: { as: cover }
moves:
  # One write verb in the prose, and the rest of the gesture — that it toggles,
  # and what it tells a screen reader — declared once with the move it names.
  show-inside:
    writes: [inside]
    sets: { inside: toggle }
    to: toggle
    note: "{inside-label}"
  show-address:
    writes: [address]
    sets: { address: toggle }
    to: toggle
    note: "{address-label}"
  show-page-two:
    writes: [page-two]
    sets: { page-two: toggle }
    to: toggle
    note: "{page-two-label}"
phrases:
  inside-label:
    on: inside
    cases:
      - { is: true, say: Hide these words again }
      - { say: Reveal the redacted words }
  address-label:
    on: address
    cases:
      - { is: true, say: Hide these words again }
      - { say: Reveal the redacted words }
  page-two-label:
    on: page-two
    cases:
      - { is: true, say: Hide these words again }
      - { say: Reveal the redacted words }
---

The clerk recorded that the door had been locked from
:mark[:do[the inside]{move=show-inside}]{kind=withheld}, and wrote nothing else
about the door.

Every visitor who signed the register that week gave the same address, which
turned out to be
:mark[:do[a house standing empty]{move=show-address}]{kind=withheld}.

:mark[:do[The second page of the report]{move=show-page-two}]{kind=withheld} was
taken out before the file was copied.
