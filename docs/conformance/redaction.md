---
title: The clerk's report
calamus: 1
lang: en
variables:
  door: { type: boolean, default: false, control: inline }
  address: { type: boolean, default: false, control: inline }
  page: { type: boolean, default: false, control: inline }
marks:
  withheld: { as: cover, note: "withheld; select to reveal" }
---

The clerk recorded that the door had been locked from
:set[the inside]{var=door to=toggle mark=withheld unless=door}, and wrote nothing
else about the door.

Every visitor who signed the register that week gave the same address, which
turned out to be :set[a house standing empty]{var=address to=toggle mark=withheld unless=address}.

:set[The second page of the report]{var=page to=toggle mark=withheld unless=page}
was taken out before the file was copied.
