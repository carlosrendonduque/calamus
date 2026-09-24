---
title: The editor's hand
lang: en
groups:
  # An ordered table of substitutions. The order is the author's: each rule runs
  # over what the ones before it left.
  rules:
    fields: [from, to]
    items:
      - { id: saw, from: I saw, to: I believe I saw }
      - { id: does-not, from: does not, to: appears not to }
      - { id: certainly, from: certainly, to: perhaps }
variables:
  line:
    type: string
    control: text
    control-at: panel
    label: "Your sentence, before anyone else touches it"
    default: "I saw the second door, and the plan does not show it."
  editing:
    type: boolean
    default: true
    control: toggle
    control-at: panel
    label: the editor's hand
marks:
  edited: { as: underline, note: "was {part.was}" }
slots:
  # An inline variation whose parameter is a table, which is the case decision 27
  # has no granularity for. The rich data stays in a declaration; the prose only
  # names it.
  rewrite:
    with: rules
    over: line
    mark: edited
    counts: edits
phrases:
  substitutions:
    on: edits
    cases:
      - when: "not editing"
        say: "The editor is off: this is the sentence as you typed it."
      - is: 1
        say: >-
          1 substitution, underlined, and it tells a screen reader the words it
          replaced.
      - say: >-
          {edits} substitutions, underlined, and each one tells a screen reader
          the words it replaced.
  # A joined list whose items are not a field but a sentence built from two
  # fields. `field:` cannot say this.
  house-style:
    list:
      of: rules
      # There is no field to name. `field:` takes one name and the item here is a
      # sentence built from two, so this join is still not writable.
      field: ???            # unexpressible
      sep: "; "
      last: "; "
    cases:
      - say: "{house-style.list}"
---

:with{live=polite}
:slot[{line}]{name=rewrite when=editing}

:with{live=polite}
{substitutions}

Type `certainly` into the line, or take out `does not`, and watch the rules find
their material. They only ever weaken an assertion: {house-style}.
