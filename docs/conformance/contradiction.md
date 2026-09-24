---
title: What the file can keep
calamus: 1
lang: en
groups:
  claims:
    fields: [id, about]
    items:
      - id: door
        about: whether the door was open at three
      - id: entry
        about: whether anything was entered after three
  statements:
    fields: [id, text, claim, holds]
    items:
      - id: s1
        text: The main door was sealed at three o'clock.
        claim: door
        holds: false
      - id: s2
        text: At two minutes past three the main door still stood open.
        claim: door
        holds: true
      - id: s3
        text: No opening was recorded after that hour.
        claim: entry
        holds: false
      - id: s4
        text: The register carries one entry timed at half past three.
        claim: entry
        holds: true
  chosen: { of: statements, where: in(held) }
  broken:
    of: chosen
    by: claim
    test: split
    keep: claim
logs:
  held:
    fields: [statement]
    append-only: false
names:
  standing: count(chosen)
  clashes: count(broken)
phrases:
  both-ways:
    list: broken
    field: about
    sep: ", and "
    say: "{list}"
  verdict:
    cases:
      - when: clashes > 0
        say: >-
          Cannot all stand. Your selection answers {both-ways} both ways.
      - when: standing < 2
        say: >-
          Hold two statements at once and see whether the file can keep them
          both.
      - say: These {standing} can stand together.
---

```calamus
each: statements
as: choices
control: toggle
on-when: in(held, item)
```

:log[{item.text}]{in=held toggle=item}

```calamus
end
```

:with{live=polite when="clashes > 0" as=broken}
{verdict}

:with{live=polite unless="clashes > 0"}
{verdict}

:do[Let them all go]{resets=held when="count(held) > 0"}
