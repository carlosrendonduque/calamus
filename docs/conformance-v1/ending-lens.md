---
title: The same three facts
calamus: 1
lang: en
groups:
  facts:
    fields: [text]
    items:
      - { text: The door was locked from the inside. }
      - { text: The register carries a name in a hand nobody recognised. }
      - { text: The clerk left at eleven and did not come back. }
  lenses:
    fields: [id, label, ending]
    items:
      - id: haunting
        label: as haunting
        ending: >-
          So the room was sealed, and the name was written by a hand that had no
          business in the building, and the clerk understood which of those two
          facts he could not stay beside. He left at eleven, and the lock was the
          last honest thing in the account.
      - id: grief
        label: as grief
        ending: >-
          So the room was sealed from the inside, which is what a man does when
          he wants an hour alone with a name. He wrote it himself, in the only
          hand he had left for it, and at eleven he went out into the cold and
          kept going.
      - id: fraud
        label: as fraud
        ending: >-
          So the room was sealed from the inside, because a locked door is the
          cheapest alibi there is. The name in the register was invented, and the
          man who invented it left at eleven, on time, with the file already
          copied.
variables:
  lens:
    type: enum
    of: lenses
    default: haunting
    control: choice
    control-label: Read the ending
    option-label: Read {item.label}
names:
  reading: first(lenses where id == lens)
---

```calamus
each: facts
as: list
```

{item.text}

```calamus
end
```

:with{live=polite}
{reading.ending}

The list above is fixed; only the closing paragraph is swapped. Nothing is added
to the evidence and nothing is taken away, so whichever ending you are holding,
it has to be built out of the same three sentences.
