import type { ReaderContent } from "../../src/types";

/**
 * Guillaume Apollinaire, "Il pleut", from "Calligrammes: poèmes de la paix et
 * de la guerre (1913-1916)", Paris, Mercure de France, 1918. The complete poem.
 *
 * Public domain. Transcribed in the original French from the French Wikisource
 * page-by-page edition of the 1918 Mercure de France printing:
 * https://fr.wikisource.org/wiki/Calligrammes/Il_pleut
 * Cross-checked against Project Gutenberg eBook #55569:
 * https://www.gutenberg.org/ebooks/55569
 *
 * Where the two transcriptions disagree, the reading printed in every edition of
 * the poem was kept: "qu’il pleut" (Gutenberg's transcription has "qu’il pleur")
 * and "hennir" (the Wikisource letter grid has "hénnir").
 *
 * On the page the five lines fall as five slanting columns of rain, one letter
 * per line. `ReaderContent.body` holds them as the five horizontal sentences
 * they spell; the falling arrangement is rebuilt by the playground's
 * `hypertext` demo, which is what that mode is for.
 */
export const ilPleut: ReaderContent = {
  title: "Il pleut",
  subtitle: "calligrammes.fr",
  body: [
    "Il pleut des voix de femmes comme si elles étaient mortes même dans le souvenir.",
    "c’est vous aussi qu’il pleut, merveilleuses rencontres de ma vie. ô gouttelettes",
    "et ces nuages cabrés se prennent à hennir tout un univers de villes auriculaires",
    "écoute s’il pleut tandis que le regret et le dédain pleurent une ancienne musique",
    "écoute tomber les liens qui te retiennent en haut et en bas"
  ]
};
