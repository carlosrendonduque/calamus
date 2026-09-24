# Examples

## Demo corpus

A tiny corpus so you can run calamus without having a body of work of your own
yet. It exists to show the conventions, not to be interesting.

Each file in `corpus/` exports one typed `ReaderContent` — the whole public
shape of the library's input: a `title`, an optional `subtitle`, and a `body`
of paragraph strings. The local playground (`playground/App.tsx`) imports these
three modules and picks one per reading mode.

Ingest is not a thing here: import the module and hand it to `<Reader>`.

```tsx
import { Reader } from "calamus";
import { tristramShandy } from "./examples/corpus/sterne-tristram-shandy";

<Reader content={tristramShandy} mode="book" />;
```

## What it demonstrates

- **One `ReaderContent` per file**, named after `author-work`, with a named
  export in `lowerCamelCase`. No default exports, no index barrel: the
  playground imports each text by path, so you can see exactly where a demo
  text comes from.
- **The `subtitle` field as a filename.** Every mode surfaces it differently —
  `terminal` prints `$ cat vol-i-chap-xxii.txt`, `editorial` prints
  `viewer --editorial fragment.fr`, `scroll` prints it under the title. Giving
  it a file-like value is a convention of this corpus, not a requirement of the
  type.
- **Prose that suits linear modes.** Sterne's chapter is ten ordinary
  paragraphs, which is what `scroll`, `book` and `terminal` are built for: they
  paginate or scroll `body` in order. Ten paragraphs is enough to produce
  several book pages at a normal window size, and to make the progress
  indicators move.
- **Short fragments that suit spatial modes.** The Mallarmé excerpt keeps each
  word-group of the poem as its own `body` entry. `editorial` mode measures
  paragraphs and distributes them over two columns and then over successive
  horizontal sheets, so many short entries show the sheet machinery that a few
  long ones would hide.
- **Text that needs a host component.** `hypertext` mode renders the header and
  then gets out of the way: it delegates everything below it to `children`. The
  Apollinaire poem is a calligram whose lines fall down the page as rain, which
  the library has no opinion about, so the playground rebuilds the fall itself
  from `ilPleut.body` and passes it in as `children`.
- **Non-English text.** Two of the three texts are French, so the corpus also
  serves as a check that the reader does not assume English typography.

## Licensing

The three texts below are public-domain literature. They were transcribed
from the sources listed, and are reproduced as printed; the only changes were
mechanical, and each corpus file documents the ones that apply to it in a
comment at the top.

- **Laurence Sterne, _The Life and Opinions of Tristram Shandy, Gentleman_**
  (1759–1767), Volume I, Chapter XXII, complete. Source: Project Gutenberg
  eBook #1079, <https://www.gutenberg.org/ebooks/1079>, which carries the
  rights statement "Public domain in the USA." Sterne died in 1768, so the work
  is also long out of copyright everywhere else. File:
  `corpus/sterne-tristram-shandy.ts`.

- **Stéphane Mallarmé, _Un coup de dés jamais n'abolira le hasard_** (1897),
  the first three double-page spreads, in the original French. First published
  in _Cosmopolis_, vol. 6, no. 17, Paris, May 1897; transcribed here from the
  French Wikisource edition of the posthumous 1914 Nouvelle Revue Française
  setting, which is the canonical typographic realisation of the poem:
  <https://fr.wikisource.org/wiki/Un_coup_de_d%C3%A9s_jamais_n%E2%80%99abolira_le_hasard_(1914)>.
  Mallarmé died in 1898, so both the 1897 and 1914 texts are in the public
  domain worldwide. File: `corpus/mallarme-un-coup-de-des.ts`.

- **Guillaume Apollinaire, _Il pleut_**, from _Calligrammes: poèmes de la paix
  et de la guerre (1913-1916)_, Paris, Mercure de France, 1918. The complete
  poem, in the original French. Transcribed from the French Wikisource
  page-by-page edition of the 1918 printing,
  <https://fr.wikisource.org/wiki/Calligrammes/Il_pleut>, and cross-checked
  against Project Gutenberg eBook #55569,
  <https://www.gutenberg.org/ebooks/55569>, which carries the rights statement
  "Public domain in the USA." Apollinaire died in 1918, and the work is long out
  of copyright in France and across the EU as well. File:
  `corpus/apollinaire-il-pleut.ts`.

Both French poems are given in French on purpose. Published translations of
either may still be in copyright, and in both works the arrangement of the
words on the page *is* the work, so a translation would not be the same
demonstration.

Neither French poem can be reproduced exactly by `ReaderContent`, which
describes a sequence of paragraphs and not a coordinate system. The excerpts
approximate the originals as the corpus files explain, and no words were added,
removed or reordered. If you want the real thing, follow the source links —
both Wikisource editions show the page scans.

Everything in `examples/` that is not one of those three excerpts — this file,
the module structure, the comments, the code — was written for this repository
and is covered by the project's MIT license, like the rest of the repo.
