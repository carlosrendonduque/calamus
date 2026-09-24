---
title: The visitors' book
calamus: 1
lang: en
logs:
  book:
    fields: [place, struck]
    append-only: true
groups:
  places:
    fields: [place]
    items:
      - { place: the reading room }
      - { place: the map case }
      - { place: the annex stair }
      - { place: the courtyard }
  standing: { of: book, where: not struck }
  withdrawn: { of: book, where: struck }
names:
  here: last(standing)
  lines: count(standing)
  crossings: count(withdrawn)
  returns: count(standing where place == here.place)
marks:
  struck: { as: strike, note: withdrawn }
phrases:
  standing:
    on: lines
    cases:
      - is: 1
        say: 1 line standing
      - say: "{lines} lines standing"
  returns:
    on: returns
    cases:
      - is: 1
        say: 1 time
      - say: "{returns} times"
  report:
    cases:
      - when: count(book) == 0
        say: >-
          The book is open and empty. Nothing you write in it can be taken out
          again.
      - say: >-
          {standing}, {crossings} struck. The book has you in {here.place}
          {returns}.
---

You are asked to sign the book each time you move. The porter will not rub
anything out, and a line you withdraw stays on the page with the withdrawal
written beside it.

```calamus
each: book
as: steps
label: The visitors' book
empty: no lines yet
current: here
```

:with{when="entry.struck"}
:mark[{entry.place}]{kind=struck}

:with{unless="entry.struck"}
{entry.place}

```calamus
each: places
as: choices
```

:log[Cross to {item.place}]{add=book place="{item.place}"}

```calamus
end
```

:with{live=polite}
{report}

:log[Withdraw the last line]{in=book at="last(standing)" set=struck when="lines > 0"}
:do[Close the book]{resets=book when="count(book) > 0"}
