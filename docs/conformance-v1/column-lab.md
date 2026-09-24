---
title: The Life and Opinions of Tristram Shandy, Gentleman
lang: en
variables:
  cols:
    type: number
    of: [1, 2, 3]
    default: 2
    control: choice
    control-at: panel
    control-label: Column count
    # The label of an option is chosen by the option's own value, which is not a
    # declared name, so this phrase is dispatched on something it cannot name.
    option-label:
      of: option
      cases:
        - { is: 1, say: 1 column }
        - { say: "{option} columns" }
  gutter:
    type: number
    min: 0
    max: 64
    step: 2
    default: 28
    unit: px
    control: range
    control-at: panel
    label: gutter
phrases:
  # `px` is prose, written by the author. `unit:` above exists so that the custom
  # property says 28px where CSS needs a length; it never enters a sentence.
  surface:
    say: "{cols} up, {gutter}px gutter"
---

:with{live=status}
{surface}

```calamus
block: columns
uses: [cols, gutter]
```

Digressions, incontestably, are the sunshine;——they are the life, the soul of
reading!—take them out of this book, for instance,—you might as well take the
book along with them;—one cold eternal winter would reign in every page of it;
restore them to the writer;—he steps forth like a bridegroom,—bids All-hail;
brings in variety, and forbids the appetite to fail.

All the dexterity is in the good cookery and management of them, so as to be not
only for the advantage of the reader, but also of the author, whose distress, in
this matter, is truly pitiable: For, if he begins a digression,—from that moment,
I observe, his whole work stands stock still;—and if he goes on with his main
work,—then there is an end of his digression.

——This is vile work.—For which reason, from the beginning of this, you see, I
have constructed the main work and the adventitious parts of it with such
intersections, and have so complicated and involved the digressive and
progressive movements, one wheel within another, that the whole machine, in
general, has been kept a-going;—and, what's more, it shall be kept a-going these
forty years, if it pleases the fountain of health to bless me so long with life
and good spirits.

```calamus
end
```

Laurence Sterne, Tristram Shandy, 1759. Take the gutter to zero at three columns
and they touch, which is the argument for having one. The count is a ceiling
rather than a promise: no column here is narrower than 13rem, so a narrow screen
is given fewer than you asked for.
