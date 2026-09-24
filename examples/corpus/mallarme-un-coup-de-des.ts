import type { ReaderContent } from "../../src/types";

/**
 * Stéphane Mallarmé, "Un coup de dés jamais n'abolira le hasard" (1897),
 * opening fragment: the first three double-page spreads.
 *
 * Public domain (Mallarmé died in 1898; first published in "Cosmopolis",
 * vol. 6, no. 17, Paris, May 1897). Transcribed in the original French from the
 * French Wikisource edition of the posthumous 1914 Nouvelle Revue Française
 * setting, which is the canonical typographic realisation of the poem:
 * https://fr.wikisource.org/wiki/Un_coup_de_d%C3%A9s_jamais_n%E2%80%99abolira_le_hasard_(1914)
 *
 * The poem's meaning lives in its position on the page, and `ReaderContent`
 * cannot express absolute placement. Each word-group that Mallarmé sets on its
 * own line is therefore kept as one entry of `body`, so `editorial` mode spreads
 * the fragments across columns and sheets. That is an approximation of the
 * original layout, not a reproduction of it — no words were added, removed or
 * reordered.
 */
export const unCoupDeDes: ReaderContent = {
  title: "Un coup de dés jamais n’abolira le hasard",
  subtitle: "fragment.fr",
  body: [
    "UN COUP DE DÉS",
    "JAMAIS",
    "QUAND BIEN MÊME LANCÉ DANS DES CIRCONSTANCES",
    "ÉTERNELLES",
    "DU FOND D’UN NAUFRAGE",
    "SOIT",
    "que",
    "l’Abîme",
    "blanchi",
    "étale",
    "furieux",
    "sous une inclinaison",
    "plane désespérément",
    "d’aile",
    "la sienne",
    "par avance retombée d’un mal à dresser le vol",
    "et couvrant les jaillissements",
    "coupant au ras les bonds",
    "très à l’intérieur résume",
    "l’ombre enfouie dans la profondeur par cette voile alternative",
    "jusqu’adapter",
    "à l’envergure",
    "sa béante profondeur en tant que la coque",
    "d’un bâtiment",
    "penché de l’un ou l’autre bord"
  ]
};
