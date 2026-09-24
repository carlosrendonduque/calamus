---
title: The editor's hand
calamus: 1
lang: en
variables:
  line:
    type: string
    default: I saw the second door, and the plan does not show it.
    control: text
    label: "Your sentence, before anyone else touches it"
  editing:
    type: boolean
    default: true
    control: toggle
    label: the editor's hand
groups:
  rules:
    fields: [from, to]
    ordered: yes
    items:
      - { from: I saw, to: I believe I saw }
      - { from: does not, to: appears not to }
      - { from: certainly, to: perhaps }
marks:
  edited: { as: insert, note: "was: {was}" }
names:
  changes: count(edits)
phrases:
  changes:
    on: changes
    cases:
      - when: not editing
        say: "The editor is off: this is the sentence as you typed it."
      - is: 1
        say: >-
          1 substitution, underlined, and each one tells a screen reader the
          words it replaced.
      - say: >-
          {changes} substitutions, underlined, and each one tells a screen reader
          the words it replaced.
  rules:
    list: rules
    field: "{item.from} to {item.to}"
    sep: "; "
    say: "{list}"
---

:with{live=polite}
:slot[{line}]{name=rewrite with=rules when=editing mark=edited counts=edits}

{changes}

Type `certainly` into the line, or take out `does not`, and watch the rules find
their material. They only ever weaken an assertion: {rules}.
