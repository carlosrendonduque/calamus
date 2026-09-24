---
title: The visitors' book
calamus: 1
lang: en
groups:
  places:
    fields: [place]
    items:
      - { place: the reading room }
      - { place: the map case }
      - { place: the annex stair }
      - { place: the courtyard }
marks:
  # Both conditions live in the declaration, and both are read in the scope of
  # the entry being printed: the line is ruled through and the word is a badge.
  withdrawn: { as: strike, when: "entry.struck", note: withdrawn }
  badge:     { as: note,   when: "entry.struck" }
logs:
  # The porter rubs nothing out: entries are marked, never removed. `marks:`
  # names the fields a later line may write on an entry already in the book.
  book:
    fields: [place, struck]
    keeps: duplicates
    removes: none
    marks: [struck]
names:
  standing: count(book where not struck)
  crossed-out: count(book where struck)
  here: last(book where not struck)
  returns: count(book where not struck and place == here.place)
phrases:
  lines-standing:
    on: standing
    cases:
      - { is: 1, say: 1 line standing }
      - { say: "{standing} lines standing" }
  returns-here:
    on: returns
    cases:
      - { is: 1, say: 1 time }
      - { say: "{returns} times" }
  report:
    on: standing
    cases:
      - when: "count(book) == 0"
        say: >-
          The book is open and empty. Nothing you write in it can be taken out
          again.
      - say: >-
          {lines-standing}, {crossed-out} struck. The book has you in
          {here.place} {returns-here}.
---

You are asked to sign the book each time you move. The porter will not rub
anything out, and a line you withdraw stays on the page with the withdrawal
written beside it.

```calamus
each: book
label: The visitors' book
empty: no lines yet
current: here
```

:with{mark=withdrawn}
{entry.place}:mark[struck]{as=badge}

```calamus
end
```

```calamus
each: places
```

:log[Cross to {item.place}]{add=book place="{item.place}"}

```calamus
end
```

:with{live=polite}
{report}

```calamus
controls:
  - mark: { log: book, entry: here, field: struck }
    label: Withdraw the last line
    when: "standing > 0"
  - resets: book
    label: Close the book
    when: "count(book) > 0"
```
