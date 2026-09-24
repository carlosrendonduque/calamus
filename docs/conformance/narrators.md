---
title: The north stair
calamus: 1
lang: en
groups:
  voices:
    fields: [id, who, source, account]
    items:
      - id: surveyor
        who: The surveyor
        source: Survey of the north stair, second visit
        account: >-
          The stair is nineteen risers. It was counted twice, on separate days,
          and the second count agrees with the first to the inch.
      - id: lodger
        who: The lodger
        source: Letter, undated, second floor back
        account: >-
          Going up there are nineteen steps. Coming down there are twenty. I have
          written to the office about it, and I have stopped counting.
      - id: editor
        who: The editor
        source: Note added to the file before it was copied
        account: >-
          Both counts above reached us from the same correspondent, four months
          apart, and neither of them matches the plan lodged with the building.
variables:
  voice:
    type: enum
    of: voices
    label: who
    default: surveyor
    control: choice
    control-label: Whose account to read
    option-label: "{item.who}"
---

```calamus
each: voices
as: quotation
where: voice == item
voice: item.id
live: polite
```

{item.account}

:with{as=attribution}
:mark[{item.who}]{kind=who} {item.source}

```calamus
end
```
