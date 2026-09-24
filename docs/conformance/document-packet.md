---
title: Three sheets came in one envelope
calamus: 1
lang: en
groups:
  exhibits:
    fields: [id, title, body]
    items:
      - id: A
        title: Exhibit A, site note, 3 March
        body: >-
          The boundary wall stands four metres and ten from the gatepost.
          Measured twice, in company.
      - id: B
        title: Exhibit B, letter to the council, 19 March
        body: >-
          There is no wall on that side of the plot, and there has been none in
          my lifetime.
      - id: C
        title: Exhibit C, transcript, 2 April
        body: >-
          — We took it down in April. — Which April? — That is the question the
          file keeps asking.
  unread: { of: exhibits, where: not in(read) }
logs:
  read:
    fields: [sheet]
    append-only: true
    starts: [{ sheet: A }]
variables:
  open: { type: enum, of: exhibits, blank: true, default: A }
moves:
  open-sheet:
    set: { open: item }
    add: { read: { sheet: item } }
    once-per: item
  next-unread:
    set: { open: first(unread) }
    add: { read: { sheet: first(unread) } }
names:
  opened: count(read)
  total: count(exhibits)
phrases:
  state:
    cases:
      - when: open
        say: "{open.title} is open. {opened} of {total} sheets opened."
      - say: "The envelope is shut. {opened} of {total} sheets opened."
  seen:
    cases:
      - when: in(read, item)
        say: opened
      - say: ""
---

Three sheets came in one envelope, with the first already on top. They do not
agree with each other, and nothing in the file says which of them was ever
read.

```calamus
each: exhibits
as: sheets
open-when: open == item
exclusive: yes
```

:do[{item.title} {seen}]{move=open-sheet as=summary}

{item.body}

```calamus
end
```

:with{live=polite}
{state}

:set[Shut the envelope]{var=open to=blank when="open"}
:do[Open the next unread sheet]{move=next-unread when="count(unread) > 0"}
