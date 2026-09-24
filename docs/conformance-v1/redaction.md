---
title: The clerk's report
calamus: 1
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

The clerk recorded that the door had been locked from :set[the
inside]{var=inside to=toggle mark=withheld note="{inside-label}"}, and wrote
nothing else about the door.

Every visitor who signed the register that week gave the same address, which
turned out to be :set[a house standing empty]{var=address to=toggle
mark=withheld note="{address-label}"}.

:set[The second page of the report]{var=page-two to=toggle mark=withheld
note="{page-two-label}"} was taken out before the file was copied.
