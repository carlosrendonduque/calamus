# Suite de conformidad del formato v1 — segunda pasada

> La primera pasada preguntó **qué le faltaba** al formato y contestó: 0 de 19. Esta pregunta es
> otra: **qué está mal en lo que se añadió.** Las seis construcciones de la v1 nunca se habían
> escrito contra nada, y las de esta carpeta son los 19 mismos ejemplos escritos con ellas.
>
> Método: se leyeron los **componentes reales** (`playground/gallery/*.tsx`), no los documentos de
> la primera pasada. De esa relectura salieron **dos bugs de plural en inglés** y un caso cero que
> nunca se escribió, los tres alisados por los documentos de la primera pasada (§2.4).

## 0. Veredicto en cinco frases

1. **18 de 19 son documentos con las propuestas de esta pasada. Con la v1 literal, ninguno** — y el
   motivo es sobrio, no polémico: **la v1 §4 declara la primitiva de grupos y en ningún sitio dice
   cómo se imprime un grupo.** La región `each:` estaba en la P3/P5 de la primera pasada y no llegó
   al texto de la v1; trece de los diecinueve la necesitan. Es una omisión al transcribir, no una
   forma equivocada, y la cuento como heredada en la tabla de abajo. `route-snapshots` sigue sin ser
   un documento, confirmado por segunda vez.
2. **La frase con casos ordenados sobrevive el ataque en su forma y falla en su enlace.** Los casos
   por cláusula entera aguantan es/en/fr sin una sola excepción, y de hecho la galería tiene **dos
   bugs de plural en inglés** que la construcción hace imposibles. Lo que no aguanta es **a qué
   puede mirar un caso**: una frase no puede ver el ítem, la salida ni el span sobre el que se
   imprime, y cinco de los 19 lo necesitan.
3. **Hay que matar `{n}` antes de que se escriba una línea de prosa.** Es un nombre que el esquema
   mete en el espacio de nombres del autor — exactamente el error de la decisión 30 — y es
   **redundante** con el nombre que ya lleva `on:`. Es el único arreglo del informe que **no** es
   aditivo: si se escribe prosa con `{n}`, cambiarlo luego reescribe todos los casos de todos los
   archivos.
4. **La primitiva de grupos y bitácoras aguanta, y el «sí o no» al borrado no.** Las ocho listas
   colapsan de verdad, pero piden **cuatro disciplinas declaradas**, no una: duplicados o único,
   borrado de ninguno / del último / de cualquiera, y campos marcables. Sin `unique:`, la frase
   «2 de 3 hojas abiertas» de `document-packet` cuenta mal y arrastra a la decisión 26 con ella.
5. **La v1 necesita una tercera pasada, corta.** Tres cosas tocan prosa y hay que cerrarlas antes
   del intérprete (§6.1); todo lo demás es aditivo y puede esperar. No es una reescritura del
   formato: es media tarde de escritura sobre el documento de formato.

## 1. Tabla por ejemplo

`E` = escribible sin ninguna construcción nueva, contando como heredadas las de la primera pasada
que la v1 absorbió en sustancia (grupos, bitácoras, región `each:`, afordancias en línea, marcas
declaradas por el autor) y respondiendo las ambigüedades de §8 de cualquier forma coherente.
`P` = necesita al menos una construcción que no existe en ninguna de las dos (la columna las nombra).
`N` = no es un documento.

| id | | Construcciones nuevas que hizo falta | Ambigüedad de §8 que hubo que resolver para escribirlo | Lo que enseñó |
|---|---|---|---|---|
| `redaction` | P | N1 (`of:` en la frase), N4, N5 | `:if`→`:with`; escapado | Sin `of:`, una etiqueta de dos estados cuesta **3 variables, 3 frases y 6 cláusulas** donde bastarían 1 frase y 2 |
| `labyrinth` | P | N2 (matar `{n}`), N6 (`removes: last`), N10 (`opens:`) | qué es un nodo; dónde empieza; `once:` | El nodo de arranque **ya cuenta una visita**, y `{seen}` lee la salida desde el sitio donde se imprime: alcance dinámico no declarado |
| `reader-path` | P | N6 (`marks:`), **N7 (escribir sobre una entrada ya escrita)**, N9 (`controls:`) | atributos de párrafo | Una bitácora append-only **con marcas** no es una bitácora: necesita una escritura que direccione `last(book where not struck)` |
| `route-snapshots` | **N** | — | — | Segunda confirmación. Necesita bitácoras **como valor**, comparación posicional y `part + 1`: el único sitio de aritmética de los 19 que no se disuelve |
| `unstable-links` | P | N5, N9 | `:if`→`:with` | `sep:` sin `last:` es lo que el componente hace de verdad (`join(", ")`), así que `last` opcional estaba bien medido |
| `footnotes` | P | N8 (`moves:`), N6 (`removes: last`), N13 (campo que referencia otro grupo) | `:if`→`:with` | Abrir la nota 1 son **tres efectos a la vez** (vaciar la cadena, escribirla, llevar el foco) y ningún verbo en línea hace los tres |
| `recover-anchor` | P | N8, N9 | atributos de párrafo | La bitácora imprime **una frase por entrada**, así que la entrada es el sujeto de la frase: `of:` otra vez |
| `document-packet` | P | N6 (**`unique:`**), N17 (`reveal: one`), N8 | **qué es un nodo**; `once:` | No son nodos: son regiones reveladas en exclusión. Y «cerrar el sobre» deja al lector **en ningún nodo**, que un rastro no sabe decir |
| `memory` | P | N10 (`opens:` con longitud literal), **N11 (`resets:` con destino literal)** | dónde empieza la lectura | «Olvídame» vuelve a **una** lectura: ni a `opens:` (dos) ni a cero. Un reinicio necesita destino |
| `session-memory` | P | N16 (`persisted()`), N9 | **escapado**; dónde empieza | La tercera rama es una pregunta al navegador: se salva con un **operador**, no con un nombre |
| `narrators` | P | N3, N5 | — | El más limpio de los 19 junto con `ending-lens`: no necesita ni una frase con casos. `option-label` es un **camino** |
| `motif-passes` | P | N5 (`:mark`), **N15 (grupo de spans marcados)** | `:if`→`:with` | La frase cuenta **palabras marcadas dentro de la prosa**, y el esquema no lleva ninguna lista de ellas. La §7 legisla la degradación de una marca que la §5 nunca define |
| `two-accounts` | P | N3 (`when` de marca contra `when` de párrafo), N12 (un solo espacio de nombres), P13 de la v0 (bloque `pair:`) | atributos de párrafo | Colisioné **yo mismo** `point` entre `marks:` y `names:` escribiéndolo. `{point}` no puede decir de cuál era |
| `disputed-hour` | P | N1 | — | El caso más pequeño de todos y el que no se puede escribir: el veredicto de una fila es **una palabra** elegida por un campo de esa fila |
| `contradiction` | P | N6 (`removes: any`), N13 | `:if`→`:with` | `by:`+`test: split` aguanta tal cual. Y una casilla se **desmarca**, así que hay un tercer borrado: por identidad |
| `evidence-score` | P | **N1** | — | **La prueba de carga de `of:`**: la cláusula se elige comparando una variable viva contra un campo del ítem, y eso no se puede desnormalizar |
| `meta-editor` | P | N14 (`list:` con frase de ítem) | escapado | La última frase une una lista cuyos ítems son **oraciones de dos campos**. `field:` toma un nombre: **hoy no se puede escribir** |
| `ending-lens` | P | N3 | — | Cero frases con casos y cero bitácoras. Lo único que le falta es dónde poner `live=polite` |
| `column-lab` | P | N1, N19 (`unit:` nunca entra en la prosa) | atributos de párrafo | `{gutter}` imprime **28**, y `px` lo escribe el autor. Si `unit:` entrara en la frase, el autor necesitaría dos nombres para una variable |

Recuento: **E = 0** · **P = 18** · **N = 1**. Y el reparto que importa no es ese, sino cuántos caen
por cada hueco:

| construcción que falta | cuántos de los 19 la llevan |
|---|---|
| atributos de párrafo (`:with`, N3) | **17** |
| región que imprime un grupo (`each:`, heredada de la primera pasada y ausente del texto de la v1) | **13** |
| alguna directiva en línea, en una sintaxis que hay que fijar (N4) | **13** |
| bitácora con disciplina declarada (N6) | **9** |
| afordancia de bloque (`controls:`, N9) | **8** |
| `:mark` (N5) | **7** |
| frase que ve el ítem sobre el que se imprime (`of:`, N1) | **5** |
| gesto con varios efectos (`moves:`, N8) | **3** |

Y el dato que más dice de la v1: **diecisiete de los diecinueve no se podían escribir sin resolver
antes una ambigüedad de su propia §8.** Las tres que bloquearon de verdad, por número de
documentos: atributos de párrafo y `:if`, que son la misma (**17**), qué es un nodo (**4**) y el
escapado (**3**).

## 2. ¿Aguanta la frase con casos ordenados?

**Sí en su forma, no en su enlace.** Y conviene separar las dos cosas, porque solo una es
irreversible: la forma (casos ordenados, cada uno una cláusula entera) es la que rompería prosa ya
escrita si cambiara, y es la que sobrevive intacta. El enlace (a qué puede mirar un caso) se arregla
**añadiendo una clave a una declaración**, así que no rompe prosa — pero hasta que se arregle, cinco
de los 19 se escriben peor de lo necesario y uno no se escribe.

### 2.1 Lo que se le lanzó

Alcance de «toda frase de cara al lector»: **toda frase que el formato genera** — frases con casos,
etiquetas de control, notas accesibles, rótulos de bitácora y líneas de estado. La prosa fija de las
obras (los tres finales de `ending-lens`, las tres voces de `narrators`, los tres exhibits de
`document-packet`, Sterne) se traduce sin tocar la construcción, y **eso es precisamente el dato**:
la construcción solo carga peso donde la frase varía. Son **90 líneas de cara al lector** —71 de ellas cláusulas de una frase con casos, el resto
etiquetas, notas accesibles y distintivos—, y están todas abajo en los tres idiomas.

Ocho ataques, en orden de dureza:

1. **Dos números en una cláusula que gobiernan palabras distintas** (`document-packet`,
   `disputed-hour`, `evidence-score`, `motif-passes`). En español el verbo concuerda con el primero
   y el sustantivo con el segundo.
2. **Cambio de raíz y de género en la palabra del número** (`vez`/`veces`, `ninguna`/`una`).
3. **El caso cero como oración distinta**, no como plural de cero (los tres idiomas lo piden, y cada
   uno de forma distinta: «No queda ninguna», «Aucune ne tient», "Nothing is left").
4. **Concordancia a distancia**: participio femenino plural a diez palabras del número.
5. **Concordancia con un ítem interpolado** que el lector elige (`two-accounts`, `document-packet`,
   `memory`, `recover-anchor`): género gramatical mezclado en material real.
6. **Contracción obligatoria del español y elisión del francés** delante de un nombre interpolado:
   `a + el` → `al`, `de + el` → `del`, `à + le` → `au`.
7. **Unir una lista cuyos ítems no son un campo sino una oración** (`meta-editor`).
8. **Elegir el caso por un campo del ítem sobre el que se imprime** (`evidence-score`,
   `disputed-hour`, `labyrinth`, `redaction`, `column-lab`).

Los ataques 1–4 los gana la construcción sin una sola excepción, y el 3 y el 4 son exactamente lo
que la decisión 30 predijo. El 5 y el 6 los gana **por los pelos y solo con ayuda del traductor**
(§2.4). El 7 y el 8 los pierde (§2.3).

### 2.2 Las 34 familias, en tres idiomas

`redaction` — nota accesible del span, dos casos sobre el booleano del propio span.

| caso | en | es | fr |
|---|---|---|---|
| `is: true` | Hide these words again | Volver a taparlas | Les masquer de nouveau |
| otro | Reveal the redacted words | Mostrar las palabras tachadas | Révéler les mots supprimés |

`labyrinth` — `stood` sobre `visits(here)`, y el distintivo de salida.

| caso | en | es | fr |
|---|---|---|---|
| `is: 1` | You have stood here once. | Has estado aquí una vez. | Vous êtes venu ici une fois. |
| otro | You have stood here {stands} times. | Has estado aquí {stands} veces. | Vous êtes venu ici {stands} fois. |
| `seen` | seen | ya visto | déjà vu |

> El componente solo imprime la frase por encima de una visita, así que **su caso singular no
> existe y el bug «1 times» nunca se vio**. Escrito con casos, el bug es inexpresable. Y el francés
> enseña algo que el inglés esconde: «fois» es invariable, así que lo que cambia es el **verbo**, y
> por eso el caso tiene que abarcar la oración.

`reader-path` — cuatro familias, la más dura de las 19.

| caso | en | es | fr |
|---|---|---|---|
| `standing is: 0` | (no llega) | No queda ninguna línea en pie | Aucune ligne ne tient plus |
| `standing is: 1` | 1 line standing | Queda una línea en pie | Une seule ligne tient |
| `standing` otro | {standing} lines standing | Quedan {standing} líneas en pie | {standing} lignes tiennent |
| `struck is: 0` | 0 struck | ninguna tachada | aucune rayée |
| `struck is: 1` | 1 struck | una tachada | une rayée |
| `struck` otro | {crossed-out} struck | {crossed-out} tachadas | {crossed-out} rayées |
| `returns is: 1` | 1 time | una vez | une fois |
| `returns` otro | {returns} times | {returns} veces | {returns} fois |
| `report` vacío | The book is open and empty. Nothing you write in it can be taken out again. | El libro está abierto y vacío. Nada de lo que escribas en él podrá sacarse después. | Le registre est ouvert et vide. Rien de ce que vous y écrirez ne pourra en être retiré. |
| `report` otro | {lines-standing}, {crossed-out} struck. The book has you in {here.place} {returns-here}. | {en-pie}, {tachadas}. El libro te sitúa en {aquí.lugar} {vueltas}. | {debout}, {rayées}. Le registre vous situe dans {ici.lieu}, {retours}. |

> Una frase inglesa se convierte en **cuatro frases y nueve cláusulas** en español. Las cuatro cosas
> que ningún sufijo alcanza aparecen todas en una línea: `Queda`/`Quedan` (el número en el verbo, y
> el verbo **antes** del sustantivo), `ninguna`/`una` (género), `vez`/`veces` (raíz), y `tachadas`
> concordando en femenino plural **a diez palabras** del número que lo decide. El francés lo
> confirma con otro juego de piezas: `tient`/`tiennent` es verbo y `rayée`/`rayées` es participio.
>
> Y el español mata de paso la promesa de reutilización de la v1 §3.2 («los plurales viven
> declarados y **reutilizables**»): `una vez` y `una línea` son el mismo número y **no son la misma
> frase**, porque el numeral concuerda con el sustantivo. En español y francés una frase de plural
> es reutilizable solo entre oraciones que hablan del mismo sustantivo, que en la práctica es nunca.

`unstable-links` — dos familias, y el bug de inglés que las justifica.

| caso | en | es | fr |
|---|---|---|---|
| `remaining == 0` | Nothing is left to take. The paragraph above is the orchard in the order you made. | No queda nada por tomar. El párrafo de arriba es el huerto en el orden que tú hiciste. | Il ne reste rien à prendre. Le paragraphe ci-dessus est le verger dans l'ordre que vous avez fait. |
| `is: 1` | 1 turning left, and not where you last saw **it**. | Queda un desvío, y no donde lo viste por última vez. | Il reste un tournant, et pas là où vous l'avez vu la dernière fois. |
| otro | {remaining} turnings left, and not where you last saw **them**. | Quedan {remaining} desvíos, y no donde los viste por última vez. | Il reste {remaining} tournants, et pas là où vous les avez vus la dernière fois. |
| `closed` vacío | (no se imprime) | (no se imprime) | (ne s'imprime pas) |
| `closed` otro | Closed behind you: {list}. | Has cerrado detrás de ti: {list}. | Vous avez fermé derrière vous : {list}. |

> **El componente tiene aquí un bug de inglés**: escribe `turning${s} left, and not where you last
> saw them`, así que con un desvío dice «1 turning left … you last saw **them**». El sufijo ya falla
> en inglés, en la propia galería, sin salir del idioma que supuestamente lo tolera. Es el argumento
> de la decisión 30 confirmado en su idioma más flojo.
>
> Y el participio de la lista unida: en español «Cerrados/Cerradas detrás de ti» concordaría con los
> ítems, cuyos géneros están mezclados y de los que además **el último lo elige el lector**. La
> salida es la que está en la tabla: reescribir la frase en forma verbal («Has cerrado») para que no
> haya participio que concuerde. **La construcción no lo resuelve; el traductor esquiva.**

`footnotes`

| caso | en | es | fr |
|---|---|---|---|
| `depth == 0` | Nothing opened yet. The chain is four notes deep. | Nada abierto todavía. La cadena tiene cuatro notas de fondo. | Rien d'ouvert pour l'instant. La chaîne a quatre notes de fond. |
| otro | Depth {depth} of {total}: note {current.mark}. | Profundidad {depth} de {total}: nota {current.mark}. | Profondeur {depth} sur {total} : note {current.mark}. |

> El francés mete espacio fino antes de los dos puntos y el español no. Es un literal dentro de
> `say:`, así que sale gratis — **a condición de que el parser no recorte espacios** en los
> escalares plegados de YAML. Hay que escribirlo en el formato.

`recover-anchor`

| caso | en | es | fr |
|---|---|---|---|
| `away` | You are in {gone.label}, off the main line. | Estás en {gone.label}, fuera de la línea principal. | Vous êtes dans {gone.label}, hors de la ligne principale. |
| `moved == 0` | The main line is stable: you have not left it yet. | La línea principal está estable: todavía no la has dejado. | La ligne principale est stable : vous ne l'avez pas encore quittée. |
| otro | Back on the main line. The log keeps every move you made. | De vuelta en la línea principal. El registro guarda todos los movimientos que hiciste. | De retour sur la ligne principale. Le journal garde tous vos déplacements. |
| entrada `down` | down to {entry.anchor.label} | bajada a la nota / **al** anexo C | descente vers {entry.anchor.label} |
| entrada `up` | up from {entry.anchor.label} | subida desde {entry.anchor.label} | retour de {entry.anchor.label} |

> **Aquí está la contracción.** Los dos anclajes son «la nota 4.2» y «el anexo C», así que la
> preposición natural produce `a la nota 4.2` y `a el anexo C` → **`al anexo C`**, que en español no
> es opcional. El caso no puede elegirse porque la frase no ve la entrada que está imprimiendo. Hay
> escapatoria — «bajada hasta el anexo C», con una preposición que no contrae — y **eso es el
> formato dictando la preposición**, que es exactamente el tipo de coste que la decisión 30 quería
> no volver a pagar.

`document-packet`

| caso | en | es | fr |
|---|---|---|---|
| `seen is: 1` | 1 of {total} sheets opened. | Se ha abierto 1 de {total} hojas. | 1 des {total} feuilles a été ouverte. |
| `seen` otro | {seen} of {total} sheets opened. | Se han abierto {seen} de {total} hojas. | {seen} des {total} feuilles ont été ouvertes. |
| `open` | {showing.title} is open. {sheet-count} | {showing.title} está abierta. {sheet-count} | {showing.title} est ouverte. {sheet-count} |
| otro | The envelope is shut. {sheet-count} | El sobre está cerrado. {sheet-count} | L'enveloppe est fermée. {sheet-count} |
| distintivo | opened | abierta | ouverte |

> Dos números en una cláusula gobernando palabras distintas: el verbo concuerda con `seen` y el
> sustantivo con `total`. Sale con dos casos porque `total` es constante; si el total también
> variara serían **cuatro**, el producto cartesiano de los dos números. Es el coste real de que un
> caso sea una cláusula entera, y hay que decirlo: **la construcción no compone, multiplica.**
>
> Y `está abierta` / `est ouverte` concuerdan con el título interpolado. Funciona **por casualidad**:
> las tres piezas son «Pieza A/B/C» y «Pièce A/B/C», femenino las tres. Un cuarto exhibit llamado
> «el acta» o «le procès-verbal» deja la frase mal escrita y sin arreglo posible, y el autor que lo
> añada no tiene por qué mirar la frase.

`memory`

| caso | en | es | fr |
|---|---|---|---|
| `is: 1` | You have just arrived, so the paragraph introduces itself… | Acabas de llegar, así que el párrafo se presenta… | Vous venez d'arriver, alors le paragraphe se présente… |
| `is: 2` | You have read this once already… | Ya has leído esto una vez… | Vous avez déjà lu ceci une fois… |
| `is: 3` | Third reading. The corridor is gone… | Tercera lectura. El pasillo ya no está… | Troisième lecture. Le couloir n'est plus là… |
| otro | You keep coming back… | Sigues volviendo… | Vous revenez sans cesse… |
| `this is: 1` | once | una vez | une fois |
| `this` otro | {times-here} times | {times-here} veces | {times-here} fois |
| `that is: 0` | not at all | ninguna vez | jamais |
| `that is: 1` | once | una vez | une fois |
| `that` otro | {times-other} times | {times-other} veces | {times-other} fois |
| ninguna puerta | Neither door has been opened yet, which is the only reason this sentence is still polite. | Todavía no se ha abierto ninguna puerta, que es la única razón de que esta frase siga siendo cortés. | Aucune porte n'a encore été ouverte, et c'est la seule raison pour laquelle cette phrase reste polie. |
| otro | You went through {last-door.name} last, and you have gone through it {this-door}. The other door has been used {that-door}. | Pasaste por {last-door.name} la última vez, y has pasado por ella {this-door}. La otra puerta se ha usado {that-door}. | Vous êtes passé par {last-door.name} en dernier, et vous l'avez franchie {this-door}. L'autre porte a servi {that-door}. |
| recuento | Readings: {r}. Doors opened: {d}. | Lecturas: {r}. Puertas abiertas: {d}. | Lectures : {r}. Portes ouvertes : {d}. |

> El componente imprime «has been used **0 times**», sin caso cero. En español «se ha usado 0
> veces» es agramatical y en francés «a servi 0 fois» también: hacen falta «ninguna vez» y
> «jamais», que son **otra oración**. Tercer sitio donde el caso cero no es el plural de cero.
>
> `por ella` y `l'avez franchie` concuerdan con «puerta»/«porte», femenino las dos. Otra casualidad
> del material, igual que en `document-packet`.

`session-memory`

| caso | en | es | fr |
|---|---|---|---|
| `not persisted()` | This browser will not store anything, so nothing written here can outlive the page. | Este navegador no va a guardar nada, así que nada de lo que escribas aquí puede sobrevivir a la página. | Ce navigateur n'enregistrera rien, donc rien de ce qui est écrit ici ne peut survivre à la page. |
| vacío | The text is keeping nothing about you. Write a line and it will outlive the page. | El texto no está guardando nada sobre ti. Escribe una línea y sobrevivirá a la página. | Le texte ne garde rien de vous. Écrivez une ligne et elle survivra à la page. |
| otro | The text has kept one sentence about you: "{note}" It survives closing the tab. | El texto ha guardado una frase sobre ti: «{note}» Sobrevive al cierre de la pestaña. | Le texte a gardé une phrase à votre sujet : « {note} » Elle survit à la fermeture de l'onglet. |

> Las comillas cambian de forma en los tres idiomas y **el texto del lector va dentro**. Dos reglas
> salen de aquí y ninguna es de estilo: la interpolación **no se vuelve a interpolar** (si el lector
> escribe `{note}`, se imprime `{note}`), y se escapa siempre como texto (§4.6).

`narrators`

| caso | en | es | fr |
|---|---|---|---|
| etiqueta de opción | {item.who} | {item.who} | {item.who} |
| pie | {speaking.who} — {speaking.source} | {speaking.who} — {speaking.source} | {speaking.who} — {speaking.source} |

> Cero frases con casos. Es el único de los 19 cuyas etiquetas son **caminos** y nada más, y por eso
> es el que menos dice.

`motif-passes`

| caso | en | es | fr |
|---|---|---|---|
| `showing == 0` | No pass is marking. The paragraph is the first clerk's alone. | Ninguna pasada está marcando. El párrafo es solo del primer escribiente. | Aucune passe ne marque. Le paragraphe est celui du premier greffier seul. |
| `is: 1` | 1 of {markable} words is marked: … | Hay 1 palabra marcada de {markable}: … | 1 mot sur {markable} est marqué : … |
| otro | {showing} of {markable} words marked: kept words are highlighted and underlined, struck words are ruled through. | Hay {showing} palabras marcadas de {markable}: las conservadas van resaltadas y subrayadas, las tachadas van con una raya. | {showing} mots sur {markable} sont marqués : les mots gardés sont surlignés et soulignés, les mots rayés sont barrés. |
| etiqueta 1 | The pass that keeps "door" | La pasada que conserva «puerta» | La passe qui garde « porte » |
| etiqueta 2 | The pass that strikes "empty" | La pasada que tacha «vacío» | La passe qui raye « vide » |
| nota `kept` | kept by the second clerk | conservada por el segundo escribiente | gardé par le second greffier |
| nota `struck` | struck by the second clerk | tachada por el segundo escribiente | rayé par le second greffier |

> El español obliga a **reordenar la oración** («Hay 1 palabra marcada de 4») porque «1 de 4
> palabras marcada» no concuerda con nada. Sale gratis con casos por cláusula y es imposible con
> sufijos. El francés añade verbo y participio: `est marqué` / `sont marqués`.
>
> Nota incómoda: la palabra marcada aparece **dos veces** en el documento, en la prosa y en la
> etiqueta del control, sin nada que las ate. Una marca no tiene nombre al que apuntar.

`two-accounts`

| caso | en | es | fr |
|---|---|---|---|
| `marked` | {on-point.subject}: marked in both accounts, which do not agree about it. | {on-point.subject}: marcado en los dos relatos, que no coinciden en él. | {on-point.subject} : relevé dans les deux comptes rendus, qui ne s'accordent pas là-dessus. |
| otro | Mark a point to find it in both columns. | Marca un punto para encontrarlo en las dos columnas. | Marquez un point pour le retrouver dans les deux colonnes. |
| nota | (the point you marked) | (el punto que marcaste) | (le point que vous avez marqué) |

> **Aquí el material sí tiene los géneros mezclados**: «La hora» (f), «El muro» (m), «La señal» (f);
> « L'heure » (f), « Le mur » (m), « Le signal » (m). Así que `marcado`/`marcada` y
> `relevé`/`relevée` concuerdan con algo que el lector elige. Esta frase **sí** se puede escribir en
> la v1, y es instructivo por qué: el punto marcado es una **variable del documento**, no el ítem de
> un bucle, así que existe un nombre (`on-point`) al que un `when:` puede preguntar el género. Dos
> cláusulas y un campo `genero` más en el grupo, y funciona.
>
> Es la línea exacta que separa lo que la construcción puede decir de lo que no: **si el sujeto de
> la concordancia tiene un nombre declarado, se puede; si es el ítem sobre el que se está
> imprimiendo, no.**

`disputed-hour`

| caso | en | es | fr |
|---|---|---|---|
| `item.agrees` | agreed | coinciden | concordent |
| otro | disputed | discrepan | divergent |
| `is: 1` | Showing 1 of {kept} minutes. The two logs disagree about {split} of them. | Se muestra 1 de {kept} minutos. Los dos registros discrepan en {split} de ellos. | 1 minute sur {kept} est affichée. Les deux journaux divergent sur {split} d'entre elles. |
| otro | Showing {showing} of {kept} minutes. The two logs disagree about {split} of them. | Se muestran {showing} de {kept} minutos. Los dos registros discrepan en {split} de ellos. | {showing} minutes sur {kept} sont affichées. Les deux journaux divergent sur {split} d'entre elles. |
| etiqueta | Only the minutes they dispute | Solo los minutos en que discrepan | Seulement les minutes sur lesquelles ils divergent |

> Otra vez dos números en una cláusula: `Se muestra`/`Se muestran` va con el primero y `minutos` con
> el segundo. Y el veredicto de una palabra es **la frase que la v1 no puede decir** (§2.3).

`contradiction`

| caso | en | es | fr |
|---|---|---|---|
| `clashes > 0` | Cannot all stand. Your selection answers {both-ways} both ways. | No pueden sostenerse todas. Tu selección responde a {both-ways} de las dos maneras. | Elles ne peuvent pas toutes tenir. Votre sélection répond à {both-ways} des deux façons. |
| `holding < 2` | Hold two statements at once and see whether the file can keep them both. | Sostén dos afirmaciones a la vez y mira si el expediente puede con las dos. | Tenez deux déclarations à la fois et voyez si le dossier peut les garder toutes les deux. |
| otro | These {holding} can stand together. | Estas {holding} pueden sostenerse juntas. | Ces {holding} peuvent tenir ensemble. |
| unión | A, and B | A, y B | A, et B |
| afirmaciones (4) | The main door was sealed at three o'clock. / At two minutes past three the main door still stood open. / No opening was recorded after that hour. / The register carries one entry timed at half past three. | La puerta principal estaba sellada a las tres. / A las tres y dos la puerta principal seguía abierta. / No se registró ninguna apertura después de esa hora. / El registro lleva una entrada a las tres y media. | La porte principale était scellée à trois heures. / À trois heures deux, la porte principale était encore ouverte. / Aucune ouverture n'a été enregistrée après cette heure. / Le registre porte une entrée à trois heures et demie. |
| asuntos (2) | whether the door was open at three / whether anything was entered after three | si la puerta estaba abierta a las tres / si se registró algo después de las tres | si la porte était ouverte à trois heures / si quelque chose a été enregistré après trois heures |

> `sep: ", and "` reproduce lo que el componente hace de verdad, incluido «A, and B» entre el
> primero y el segundo, y en español queda «A, y B», que es igual de raro y **igual de autoriado**.
> La librería no elige conjunción, y aquí se ve por qué: si la eligiera, «corregiría» el texto.
>
> Los asuntos empiezan por «si»/« si », así que la preposición `a`/`à` no contrae. Otra casualidad
> del material.

`evidence-score`

| caso | en | es | fr |
|---|---|---|---|
| `trust >= item.floor` | {item.plain} | {item.plain} | {item.plain} |
| otro | {item.hedged} | {item.hedged} | {item.hedged} |
| `is: 1` | 1 of {total} claims survives at this reliability; {asserted} are stated without hedging. | 1 de {total} afirmaciones sobrevive a esta fiabilidad; {asserted} se dicen sin matizar. | 1 affirmation sur {total} survit à cette fiabilité ; {asserted} sont énoncées sans réserve. |
| otro | {surviving} of {total} claims survive at this reliability; {asserted} are stated without hedging. | {surviving} de {total} afirmaciones sobreviven a esta fiabilidad; {asserted} se dicen sin matizar. | {surviving} affirmations sur {total} survivent à cette fiabilité ; {asserted} sont énoncées sans réserve. |
| lectura | {trust}% | {trust} % | {trust} % |
| cláusulas (6) | The door was locked from the inside. / The door is described as having been locked from the inside. / … | La puerta estaba cerrada por dentro. / Se dice que la puerta estaba cerrada por dentro. / … | La porte était fermée de l'intérieur. / La porte est décrite comme ayant été fermée de l'intérieur. / … |

> El francés pone espacio antes del `%` y el inglés no: literal en `say:`, gratis. Y `survives`/
> `survive`, `sobrevive`/`sobreviven`, `survit`/`survivent` — el verbo con el primer número **en los
> tres idiomas**, que es la única vez que el inglés paga lo mismo que los demás.
>
> Y la primera fila es la que hunde el enlace: la elección entre `plain` y `hedged` compara una
> variable viva contra un campo del ítem que se está imprimiendo. No hay nombre declarado que
> nombre ese ítem. **No se puede escribir en la v1** (§2.3).

`meta-editor`

| caso | en | es | fr |
|---|---|---|---|
| `not editing` | The editor is off: this is the sentence as you typed it. | El editor está apagado: esta es la frase tal y como la escribiste. | Le correcteur est éteint : voici la phrase telle que vous l'avez tapée. |
| `is: 1` | 1 substitution, underlined, and it tells a screen reader the words it replaced. | 1 sustitución, subrayada, y le dice a un lector de pantalla las palabras que reemplazó. | 1 substitution, soulignée, et elle indique à un lecteur d'écran les mots qu'elle a remplacés. |
| otro | {edits} substitutions, underlined, and each one tells a screen reader the words it replaced. | {edits} sustituciones, subrayadas, y cada una le dice a un lector de pantalla las palabras que reemplazó. | {edits} substitutions, soulignées, et chacune indique à un lecteur d'écran les mots qu'elle a remplacés. |
| nota | (was: {part.was}) | (antes: {part.was}) | (avant : {part.was}) |
| estilo de la casa | I saw to I believe I saw; does not to appears not to; certainly to perhaps | vi a creo que vi; no a parece que no; ciertamente a quizá | j'ai vu à je crois avoir vu ; ne pas à ne semble pas ; certainement à peut-être |

> `subrayada`/`subrayadas` y `soulignée`/`soulignées` concuerdan con el número **dentro** de la
> misma oración: los casos lo dan. Lo que no da es la última fila: la lista se une con «; » y cada
> ítem es **una oración de dos campos**. `field:` toma un nombre. **Hoy no se puede escribir** (N14).

`ending-lens`

| caso | en | es | fr |
|---|---|---|---|
| etiqueta de opción | Read {item.label} | Leer {item.label} | Lire {item.label} |
| lentes (3) | as haunting / as grief / as fraud | como aparición / como duelo / como fraude | comme hantise / comme deuil / comme fraude |

> «Leer como aparición» — el ítem lleva su propia preposición dentro, que es lo que salva la frase.
> Si la etiqueta fuera «la aparición» habría que decidir entre `Leer la` y `Leer el`.

`column-lab`

| caso | en | es | fr |
|---|---|---|---|
| `is: 1` | 1 column | 1 columna | 1 colonne |
| otro | {option} columns | {option} columnas | {option} colonnes |
| superficie | {cols} up, {gutter}px gutter | {cols} columnas, medianil de {gutter}px | {cols} colonnes, gouttière de {gutter}px |

> `{gutter}` imprime **28**, no «28px»: la unidad es prosa del autor, y `unit: px` existe solo para
> que la custom property diga una longitud. Si `unit:` entrara en la frase, el autor necesitaría
> **dos nombres para una variable** (uno con unidad para el texto y otro sin ella para el control),
> que es el sitio donde la regla de las llaves se volvería burocracia de verdad. No lo es porque la
> unidad se escribe a mano (§4, N19).

`route-snapshots` — lo que sí es frase, para que conste.

| caso | en | es | fr |
|---|---|---|---|
| `kept` | Walks kept: {kept}. Pick two. | Paseos guardados: {kept}. Elige dos. | Promenades gardées : {kept}. Choisissez-en deux. |
| iguales | The two walks are the same, step for step. | Los dos paseos son el mismo, paso por paso. | Les deux promenades sont la même, pas pour pas. |
| distintos | They agree for {part} steps, and part at step {part + 1}. | Coinciden durante {part} pasos, y se separan en el paso {part + 1}. | Elles concordent pendant {part} pas, et se séparent au pas {part + 1}. |
| banderas | shared / differs / (ended) | compartido / difiere / (terminó) | partagé / diffère / (terminé) |

> `{part + 1}` es el único sitio de aritmética de los 19 que no se disuelve, y el francés añade un
> segundo problema del mismo tamaño: `au {n}e pas` pide **ordinales**, cuya regla real es `n mod 10`
> con excepciones (`1er`, `2e`), igual que las bandas de plural del polaco. La salida es la misma que
> la v1 ya eligió para el plural: un **nombre del registro**. No hace falta nada nuevo, pero hay que
> escribir que el mismo escape sirve para los ordinales.

### 2.3 La frase que no puede decir

Es la más corta de las diecinueve, y no hace falta salir del inglés para encontrarla:

> **`disputed`**

Una palabra, el veredicto de una fila de `disputed-hour`, elegida por `item.agrees`. Y su hermana
mayor, que es la que de verdad cierra el caso, es la primera fila de `evidence-score`:

```yaml
phrases:
  clause:
    cases:
      - { when: "trust >= item.floor", say: "{item.plain}" }
      - { say: "{item.hedged}" }
```

**En la v1 nada de esto está definido.** Una frase se declara en el front matter y se interpola en
la prosa; la v1 no dice en qué ámbito se evalúan sus casos, así que `item` dentro de un caso es un
nombre que no existe, o existe solo porque la frase se ha interpolado dentro de una región `each:` —
que es **alcance dinámico**, el mismo mecanismo que hace que dos llamadas a la misma frase
signifiquen cosas distintas, y que ningún formato del estudio usa.

Cinco de los 19 lo necesitan y **ninguno de los cinco es raro**:

| ejemplo | qué necesita ver la frase | ¿se puede esquivar? |
|---|---|---|
| `evidence-score` | `item.floor`, comparado contra una variable viva | **No.** La elección depende del dial, así que no se puede precalcular por ítem |
| `disputed-hour` | `item.agrees` | Sí, desnormalizando: un campo `verdict` escrito a mano en las cuatro filas. Coste: el autor repite un dato derivado y el traductor traduce cuatro palabras en vez de dos casos |
| `labyrinth` | `exit.to`, para el distintivo «ya visto» | Solo con alcance dinámico, que es lo que hizo la primera pasada sin decirlo |
| `redaction` | el span sobre el que se imprime la etiqueta | Sí, a lo bruto: **3 variables y 3 frases idénticas** para una etiqueta de dos estados. Está medido en `redaction.md` |
| `column-lab` | el valor de la opción (`1`, `2`, `3`) | Sí, convirtiendo las opciones en un grupo con campo `label`. Entonces la frase desaparece y vuelve a ser un camino |

Y la versión en español y francés del mismo agujero, que es peor porque el autor **no se enteraría**:
`document-packet` dice «{título} está abierta» y `memory` dice «has pasado por ella», y las dos
frases son correctas **por casualidad**, porque las tres piezas y las dos puertas comparten género.
Un cuarto exhibit masculino deja la frase mal y no hay dónde arreglarla. En `two-accounts`, donde el
material **sí** tiene los géneros mezclados, la frase se salva — y se salva por el motivo exacto que
define la frontera: **el sujeto de la concordancia es una variable del documento, así que tiene un
nombre.** Cuando es el ítem sobre el que se imprime, no lo tiene.

**El arreglo (N1), y por qué no hay prisa por acertarlo:** la frase declara su sujeto.

```yaml
phrases:
  clause:
    of: item                 # el nombre bajo el que la frase ve aquello sobre lo que se imprime
    cases:
      - { when: "trust >= item.floor", say: "{item.plain}" }
```

Es **una clave en una declaración**, así que es aditivo: la prosa no cambia. Coste para un parser a
mano: cero sintaxis nueva; en la evaluación, pasar un binding en vez de leerlo de una pila. Y respeta
la regla de la decisión 30 porque **el nombre lo pone el autor** (`of: item` podría ser `of: fila`) y
el esquema solo aporta la clave `of`.

### 2.4 Lo que sí aguantó, dicho para que conste

Un ataque que sobrevive por pereza no valida nada, así que esto es lo que se le lanzó y no rompió:

- **Casos por cláusula entera contra 71 cláusulas en tres idiomas: cero excepciones.** Las cuatro
  cosas que la decisión 30 predijo aparecen todas en material real (`Queda`/`Quedan`, `ninguna`/`una`,
  `vez`/`veces`, `tachadas` a diez palabras) y aparecen **también en francés** con otras piezas
  (`tient`/`tiennent`, `rayée`/`rayées`, `vu`/`vus`, `est marqué`/`sont marqués`).
- **El caso cero es otra oración en los tres idiomas y en tres ejemplos distintos**
  (`reader-path`, `memory`, `unstable-links`), y en español y francés además es **agramatical**
  escribirlo como plural de cero. Confirmado.
- **El sufijo ya falla en inglés.** `unstable-links` escribe «1 turning left … you last saw **them**»
  y `labyrinth` habría escrito «1 times» si su condición no lo tapara. La decisión 30 se defendía con
  el español y no le hacía falta.
- **La librería no elige conjunción, y hace bien**: `contradiction` imprime «A, and B» a propósito, y
  cualquier conjunción automática lo «corregiría». `sep:` obligatorio y `last:` opcional es lo que el
  código real hace (`join(", ")` en `unstable-links`, `join(", and ")` en `contradiction`).
- **`is: n` como azúcar de `when: x == n`** no produjo ni una ambigüedad en 34 familias. Un mecanismo.
- **El escape del plural por registro** (`plural: pl`) cubre también los ordinales que pide
  `route-snapshots` en francés, así que no hace falta una segunda escapatoria.

### 2.5 `{n}` hay que matarlo ahora, y es lo único con prisa

La v1 §2 escribe el caso general así — con el nombre del autor:

```yaml
- { say: Quedan {lineas} líneas en pie }
```

y la §3.2 del informe de la primera pasada escribe la misma cosa así:

```yaml
- { say: You have stood here {n} times. }
```

**Dos formas de decir lo mismo, y la segunda viola la regla que la v1 se acaba de afilar.** `{n}` es
un nombre que el esquema mete en el espacio de nombres del autor; si un autor declara un contador de
notas llamado `n`, `{n}` dentro de un caso significa otra cosa. Es literalmente el error de la
decisión 30 — ontología del esquema dentro del espacio del autor — cometido en la construcción que
la decisión 30 dice que hay que cerrar primero.

Y no es el único: la primera pasada usa también `{list}` (la lista unida), `{item.*}`, `{entry.*}`,
`{exit.*}` y `here`. Al escribir los 19 hubo que elegir, y la elección fue:

- **`{n}` se va.** El caso interpola **el nombre que `on:` nombra** (`{stands}`, `{standing}`,
  `{remaining}`). En 34 familias no hizo falta nunca otra cosa.
- **`{list}` se va**: la lista unida es un campo de la propia frase, `{closed-behind.list}`, así que
  vive bajo el nombre que el autor le dio a la frase.
- **`item`, `entry`, `exit` los nombra el autor** con `of:` (N1).

Con eso el esquema no aporta **ni un nombre** dentro de las llaves, que es lo que la regla decía. Y
la urgencia: los tres primeros son cambios en **cuerpos de caso**, es decir, en prosa. Todo lo demás
de este informe es aditivo; esto no.

## 3. ¿Aguanta la primitiva de grupos y bitácoras?

**La colapsación es real; la disciplina única no.** La v1 dice dos cosas y solo una se cumple.

### 3.1 Las ocho listas, una por una

| necesidad | ¿colapsa? | qué pidió que una bitácora no es |
|---|---|---|
| el rastro de `labyrinth` | Sí | Quitar del final (`to: back`), y que `visits()` baje con ello |
| el libro de `reader-path` | **No** | Una **escritura sobre una entrada ya escrita**: marcar `last(book where not struck)` |
| los saltos de `recover-anchor` | Sí | Que cada entrada se imprima como **una frase**, no como un campo |
| las hojas de `document-packet` | **No** | **Unicidad.** Un log conserva duplicados por contrato, y «2 de 3 hojas» cuenta mal en cuanto una hoja se reabre |
| las puertas de `memory` | Sí | Una **longitud inicial** (`opens: { readings: 2 }`), o el autor escribe dos entradas vacías a mano |
| la cadena de `footnotes` | Sí | Quitar del final, **y que el último elemento decida qué salida existe** |
| los giros de `unstable-links` | Sí | Un grupo derivado por **ausencia** de la bitácora, cuyo orden de impresión no es el de inserción |
| las afirmaciones de `contradiction` | **No** | Quitar **por identidad**: una casilla se desmarca, y eso no es «el último» |

Seis de ocho colapsan tal cual. Las tres que no lo hacen no piden una primitiva nueva: piden que la
bitácora **declare su disciplina**, y la v1 solo ofrece una pregunta de sí o no («cada bitácora
declara si admite borrado»). Hacen falta tres ejes y los tres están ganados por un ejemplo distinto:

```yaml
logs:
  book:   { fields: [place, struck], keeps: duplicates, removes: none, marks: [struck] }
  read:   { fields: [sheet],         keeps: unique,     removes: none }
  chain:  { fields: [note],          keeps: unique,     removes: last }
  held:   { fields: [statement],     keeps: unique,     removes: any }
```

`keeps:` lo gana `document-packet`, `removes: last` lo ganan `footnotes` y `labyrinth`,
`removes: any` lo gana `contradiction`, y `marks:` lo gana `reader-path`. **Y `keeps: unique` sostiene
la decisión 26**: sin él, «2 de 3 hojas abiertas» solo se puede escribir restando duplicados, que es
aritmética. La disciplina de la bitácora no es un detalle de implementación: es lo que mantiene el
lenguaje de condiciones pobre.

### 3.2 Dónde una bitácora tiene que ser algo que una bitácora no es

Seis sitios, en orden de gravedad:

1. **Un valor** (`route-snapshots`). Paseos guardados son **bitácoras dentro de una bitácora**, más
   una selección de dos, más una comparación posicional. Segunda confirmación de que no es un
   documento: el problema no es que falte una clave, es que no hay forma de tener una lista de listas.
2. **Un registro mutable** (`reader-path`). Marcar una línea retirada es escribir un campo de una
   entrada que ya está escrita. `:set` escribe variables; nada escribe dentro de una entrada. Hace
   falta una escritura que **direccione** la entrada (`entry: last(book where not struck)`), y eso es
   lo más cerca que el formato está de tener punteros. Es la propuesta que menos me gusta de todo el
   informe y no le encuentro sustituto: el ejemplo existe y su tema **es** que no se borra nada.
3. **Una pila que gobierna la estructura** (`footnotes`). El último elemento de la cadena decide qué
   salida existe: `first(notes where id == last(chain).note.child)`. Una bitácora que solo se imprime
   no necesita eso; esta es una bitácora que **navega**.
4. **La prosa misma** (`motif-passes`). La frase cuenta palabras marcadas, y las marcas viven en el
   párrafo, no en un grupo. Las dos salidas malas son convertir el párrafo en datos (que es lo
   contrario de todo el formato) o cambiar la frase para que cuente pasadas en vez de palabras (que es
   cambiar la obra). La buena es que el esquema lleve un grupo de **los spans marcados del propio
   documento**, igual que lleva el rastro (N15).
5. **Un conjunto con complemento ordenado** (`unstable-links`). `left: { of: turns, where: "not in(taken, item) }` más `order: unstable`
   en la región. Esto **sí** funciona, y confirma el veredicto de la v1 §9: `order:` toma un nombre que
   resuelve el registro y la decisión 21 queda reconciliada con la 23.
6. **Un estado sin lugar** (`document-packet`). «Cerrar el sobre» deja al lector sin ninguna hoja
   abierta. Si las hojas fueran nodos, el rastro tendría que poder decir «en ningún nodo», que no sabe
   decir. Es el argumento que decide §5.3.

### 3.3 «El rastro es la bitácora que el esquema lleva gratis»

Casi. Tres correcciones, todas pequeñas y ninguna cosmética:

- **Gratis no es sin nombre.** El rastro imprime `{entry.title}`, y `entry` y `title` los pone el
  esquema. O el autor nombra el rastro y sus accesores (`logs: { recorrido: { keeps: nodes } }`), o hay
  que **escribir la lista cerrada de accesores que el esquema aporta y prohibir que un autor los
  sombree**. La regla «el esquema solo aporta operadores» es inalcanzable tal cual: aporta también
  accesores, y fingir que no es como se descubren las colisiones tarde. Lo descubrí colisionando
  `point` entre `marks:` y `names:` en `two-accounts.md`, escribiéndolo.
- **El rastro se acorta.** `to: back` quita del final, así que `visits()` no es monótono. Hay que
  escribirlo: en `labyrinth` retroceder **baja** la cuenta de visitas, y eso es una decisión de obra,
  no un detalle.
- **`resets:` necesita destino.** En `memory`, «Olvídame» vuelve a **una** lectura: no a `opens:`, que
  son dos, ni a cero. Un reinicio sin destino solo sabe hacer una de las tres (N11).

### 3.4 Y la decisión 26, verificada en vez de heredada

La primera pasada concluyó que tres de los cuatro sitios de aritmética se disuelven. **Se disuelven, y
hay un quinto sitio que la primera pasada no contó:**

| sitio | qué lo disuelve |
|---|---|
| `entries.length - kept.length` (`reader-path`) | `count(book where struck)`. Dos conteos sobre el mismo grupo filtrado de dos maneras |
| `Math.min(readings, 4)` (`memory`) | Casos ordenados `is: 1/2/3/otro`. La escalera **es** la lista de casos |
| `previous + 1` (`memory`) | Añadir a una bitácora. Contar es la longitud |
| `1 + ((step*5) % (n-1))` (`unstable-links`) | `order: unstable`, un nombre del registro. Lo autoriado es «el orden es inestable» |
| `depth * 1.1rem` (`footnotes`) | `--step` por entrada, y la multiplicación cae en CSS (`calc`) |
| `part + 1`, `Math.max`, `indexOf` (`route-snapshots`) | **Nada.** No es un documento |

Así que la decisión 26 aguanta, con una condición que no estaba escrita: aguanta **porque** la
bitácora puede declararse única. Si contar duplicados fuera obligatorio, `document-packet` necesitaría
una resta y la decisión 26 se caería por un ejemplo de tres hojas.

## 4. ¿Basta `{nombre}` con la regla «las llaves llevan un nombre, jamás una expresión»?

**Basta, y la regla merece pagarse — con una corrección y una ampliación.** Las cuentas, sobre los 19:

- **152 interpolaciones** en total, contadas sobre los 19 archivos.
- **89 son nombres desnudos** (`{standing}`, `{trust}`, `{surface}`).
- **59 son caminos de un punto** (`{item.place}`, `{gone.label}`, `{next-unread.id}`).
- **4 son caminos de dos puntos** (`{entry.note.mark}`, `{entry.anchor.label}`, `{last-door.name}`).
- **1 no se puede escribir** (la unión de `meta-editor`, que no es un nombre ni un camino sino una
  oración por ítem).
- Y **cero** que necesiten una operación dentro de las llaves. Ni una, en 152.

### 4.1 La ampliación: un camino no es un nombre, y la regla tiene que decirlo

Cuarenta y uno por ciento de las interpolaciones son caminos, y el formato no puede prescindir de ellos: sin
`{item.place}` una región `each:` no imprime nada. Así que la regla queda:

> Entre llaves va **un nombre o un camino de nombres separados por puntos**. Nunca una llamada, un
> operador ni un literal.

Coste para un parser a mano, medido sobre lo que hay que escribir: leer `[A-Za-z0-9_-]` y `.` hasta
`}`, partir por `.`, resolver el primer segmento en el espacio de nombres y los siguientes como
campos. Son unas quince líneas y **no se pueden escalar**, que es justo el propósito: no hay sitio
donde meter un paréntesis, así que nadie va a pedir `{count(x)}` el año que viene. Comparado con la
alternativa (un evaluador dentro de la prosa) la diferencia no es de tamaño, es de categoría.

### 4.2 Dónde la regla se vuelve burocracia

Tres sitios, y ninguno cuesta lo que parece:

1. **`on:` con una expresión.** `labyrinth` necesita `visits(here)`, que no es un nombre. Dos
   lecturas: o `on:` acepta expresiones, o el autor declara `names: { stands: visits(here) }` y
   escribe `on: stands`. **La segunda, y es lo que hacen los 19**: así el mismo nombre sirve para el
   `on:`, para el cuerpo del caso y para el `when:` de un párrafo, y **desaparece `{n}`** (§2.5). Una
   línea de `names:` por cosa contada; en los 19 son 38 líneas de `names:` en total. Es el precio de que las
   llaves no evalúen nunca, y es barato.
2. **Nombres para constantes.** `{total}` en `document-packet`, `footnotes`, `motif-passes` y
   `evidence-score` es `count(<grupo>)`, es decir, un nombre para el número 3 o 4. Parece burocracia
   y no lo es: el autor que añade un exhibit no tiene que acordarse de cambiar la frase. Aquí la
   regla **mejora** el documento.
3. **Unidades.** Si `{gutter}` imprimiera «28px» porque la variable declara `unit: px`, el autor
   necesitaría **dos nombres para una variable**: uno con unidad para la frase y otro sin ella para el
   control y para el CSS. Eso sí sería burocracia, y se evita con una regla de una línea: **`{nombre}`
   imprime el valor; la unidad la escribe el autor en la prosa (`{gutter}px`); `unit:` existe solo
   para la custom property.** Lo mismo con `%` en `evidence-score` — donde además el francés escribe
   «72 %» con espacio y el inglés «72%» sin él, así que **la unidad tenía que ser prosa de todos
   modos.**

### 4.3 El único sitio donde la regla es insuficiente de verdad

La última frase de `meta-editor`:

> They only ever weaken an assertion: **I saw to I believe I saw; does not to appears not to;
> certainly to perhaps**.

Es una lista unida cuyos ítems son **oraciones de dos campos**. La v1 ofrece `list:` + `field:`, y
`field:` toma **un** nombre. No hay forma de escribirlo, y la salida no es ampliar las llaves: es que
`list:` acepte una **frase de ítem** en vez de un campo (N14), porque una frase es lo que ya sabe
construir una oración a partir de campos — y de paso resuelve la pluralización por ítem dentro de una
unión, que ninguno de los 19 necesita hoy pero que existe en cuanto alguien une una lista de
cantidades.

### 4.4 Veredicto sobre la regla

**Es correcta y hay que mantenerla.** Los dos argumentos son el parser (una expresión en la prosa es
un evaluador en la prosa, y de ahí no se vuelve) y la traducción: el documento en español y el
documento en francés comparten **los nombres** y no comparten ni una cláusula, así que el nombre es
el punto de anclaje de la localización. Si las llaves llevaran expresiones, cada traducción
reescribiría lógica, y la primera vez que las dos lógicas difirieran nadie se enteraría.

## 5. Los ocho bloqueadores de la §8, resueltos

Cada uno lleva recomendación, el motivo salido de escribir los 19, y **lo que cuesta a un parser
escrito a mano**, porque eso es lo que la regla de cero dependencias convierte en dato.

### 5.1 `:if` es agramatical → se va, y su sitio lo ocupa un atributo de párrafo

**Recomendación: borrar `:if`.** En su lugar, una directiva en línea **sin hijos** que sea lo primero
de un párrafo se consume como **atributos de ese párrafo**:

```markdown
:with{when="showing > 0" weight=note lang=fr id=informe live=polite}
Aucune passe ne marque.
```

Tres razones, las tres salidas de escribir los 19 y ninguna estética:

1. **Es gramatical.** Una directiva en línea en la ranura en línea es legal; lo ilegal era que el
   ámbito fuera «el párrafo siguiente», que la gramática no sabe expresar. Aquí el ámbito es **el
   párrafo que la contiene**, que es lo único que un parser puede saber sin mirar adelante.
2. **La expresión se salva.** Va en un **valor de atributo**, que no es Markdown en línea, así que un
   `*`, un `_` o un `[` dentro de la expresión sobreviven. Esto es la mitad del bloqueador y se
   resuelve sola al mover la expresión de los hijos a un atributo.
3. **Resuelve el bloqueador siguiente con la misma construcción**, y eso importa más que las dos
   anteriores: un formato que no se puede romper después no debería tener dos mecanismos donde cabe
   uno.

Lo usan **diecisiete de los diecinueve**, casi siempre para `live=polite|status`, que es lo que hacen
los componentes con `role="status"` y `aria-live`, y en dos de ellos además para `when:`, porque la condición se fue casi siempre a la declaración de
una marca o de una frase, que es donde el ámbito está definido.

Una cosa que hay que escribir y que la v1 no dice: **dentro de un atributo, los literales de cadena
de una expresión van en comillas simples** (`when="note == ''"`). Sin esa regla, `session-memory` no
se puede escribir sin escapar comillas dentro de comillas, que es el mismo error de anidar ranuras
que mató a `:if`.

**Descartado y por qué:** un bloque envolvente (`:::when`) para condicionar párrafos. La v1 ya
necesita el envolvente para variables de superficie (`block: columns` en `column-lab`, `pair:` en
`two-accounts`), y gastarlo también en condiciones convierte cada párrafo condicional en tres líneas
y multiplica la pregunta de si las regiones anidan.

**Coste para el parser:** cuando el primer token en línea de un párrafo es `:nombre{…}` sin hijos, se
retira del árbol y sus atributos se cuelgan del párrafo. Una comprobación, sin mirar adelante, sin
Markdown completo. Unas veinte líneas.

### 5.2 Un párrafo no tiene dónde llevar atributos → el mismo `:with`

**Recomendación: `weight`, `id`, `voice`, `lang`, `mark`, `live` y `when` son atributos de párrafo, y
se escriben con la construcción de §5.1.** Ni una clave nueva, ni una granularidad nueva.

El que decide es **`lang`**, y no lo decide un ejemplo: lo decide la decisión 2. Dos de los tres
corpus de la demo son franceses **en original**, así que un documento en español o en inglés va a
llevar párrafos en francés, y un párrafo sin `lang` es un párrafo que el lector de pantalla pronuncia
mal y que el navegador silabea mal. Era la única de las cuatro claves de la §8 que parecía adorno y
es la única que tiene una decisión detrás.

`weight` lo piden `recover-anchor` (un encabezado de aparato crítico) y `narrators` (un pie de foto);
`mark` lo piden `two-accounts` y `evidence-score`, donde **la marca es de la línea entera**.

Y una distinción que hubo que hacer escribiendo `two-accounts`: **`when` en un párrafo decide si el
párrafo está; `when` en una marca decide si la marca está.** No son el mismo atributo con dos
alcances: la línea de `two-accounts` está siempre y solo la regla lateral aparece y desaparece. Por
eso la condición de una marca va **en la declaración de la marca**, y se evalúa en el ámbito de lo que
la lleva:

```yaml
marks:
  disputed: { as: rule, when: "item.id == marked", note: the point you marked }
```

Esa es también la regla general que hace falta para §2.3, dicha en una línea: **toda expresión se
evalúa en el ámbito de la cosa que la lleva; una frase no lleva ámbito propio, y por eso tiene que
declarar su sujeto.**

### 5.3 Qué es un nodo al renderizar → **una página que sustituye**, y las regiones revelan

**Recomendación: entrar en un nodo sustituye. Lo que se revela en sitio son regiones, con
`:go{show=}`. `visited()` y el rastro cuentan nodos, nunca regiones.**

Esto **corrige a la primera pasada**, que contó «solo dos navegan de verdad; el resto revelan en
sitio» y concluyó que un nodo debería ser una región. El recuento correcto es otro: **quince de los
diecinueve tienen exactamente un nodo**, así que no dicen nada sobre el asunto. De los que tienen
más de uno, **todos sustituyen**: `labyrinth` y `route-snapshots`. Y `document-packet`, que es el que
parecía pedir revelación, **no es multinodo**: es un grupo con revelación exclusiva, y lo prueba su
propio botón «cerrar el sobre», que deja al lector sin ninguna hoja abierta — un estado que un rastro
de nodos no sabe decir, porque no existe «en ningún nodo».

`footnotes` remata el argumento desde el otro lado: su cadena acumula, pero su profundidad es **su
propia bitácora**, no el rastro, y tiene que poder acortarse sin que el rastro se entere.

Con eso `visited()` deja de ser ambiguo y la revelación deja de contaminar el rastro. Y hay una
consecuencia que había que ganar en algún sitio: como revelar no es visitar, **`document-packet`
necesita `keeps: unique` en su bitácora de hojas leídas** (§3.1), que es lo que sostiene la decisión 26.

**Coste:** el compilador emite una región por nodo y muestra una; las regiones reveladas son
`hidden` conmutado. `reveal: one` sobre una región de grupo (N17) es una línea de estado compartido.

### 5.4 Dónde empieza la lectura → `opens:`, y `start:` es azúcar de `opens:`

**Recomendación: una sola clave, `opens:`, que declara el contenido inicial del rastro, de las
bitácoras y de las variables. `start: x` es azúcar de `opens: { trail: [x] }`.** Dos formas de decir
lo mismo es lo que hay que evitar, y aquí se evita gratis.

Y las dos respuestas que faltaban, las dos medidas contra el código:

- **El nodo de arranque está en el rastro**, así que `visits(platform)` vale 1 antes de que el lector
  toque nada: `Labyrinth.tsx` arranca con `useState([START])`. No es una elección de diseño, es lo que
  el ejemplo hace.
- **Un rastro inicial no vacío es obligatorio**, y lo son dos ejemplos a propósito (decisión 20):
  `memory` abre con dos lecturas hechas y una puerta ya usada, y `session-memory` se siembra a sí
  misma su propia nota.

`memory` añade además el detalle que decide la **forma** de `opens:`: si contar es la longitud de una
bitácora, un estado inicial de dos lecturas se escribe con dos entradas vacías a mano. Eso es feo y
es evitable: `opens: { readings: 2 }` sobre una bitácora significa «dos entradas anónimas». Es un
literal, no una operación, así que no toca la decisión 26.

### 5.5 `once: true` → **se borra**, porque es una tercera forma de decir lo que ya se puede decir

**Recomendación: quitar `once:` del formato.** Los tres comportamientos que hay en los 19 se escriben
con dos construcciones que ya existen:

| lo que hace el ejemplo | cómo se escribe sin `once:` |
|---|---|
| `unstable-links`: el giro tomado **desaparece** de la lista | la región imprime un grupo derivado: `left: { of: turns, where: "not in(taken, item)" }` |
| `labyrinth`: la salida sigue **usable** y lleva el distintivo «ya visto» | `note: "{seen}"`, y la salida no cambia |
| `document-packet`: la hoja sigue abierta y lleva «abierta» | `mark: opened` con `when:` en la declaración de la marca |

Es decir: **desaparecer es el `when:` de la salida** —una de las dos puertas de la decisión 26, que ya
está— **y quedarse inerte es una marca**. `once:` no añade nada y obliga a elegir entre dos obras
distintas con una sola palabra, que es exactamente el motivo por el que la §8 no podía decidirlo: la
pregunta estaba mal planteada, no era difícil.

Y ninguno de los 19 necesita el tercer caso, «visible pero inerte»: ni uno solo desactiva una salida
sin quitarla. Si algún día aparece, es `mark:` más el `when:` de la salida, ya en el formato.

### 5.6 Interpolar texto del lector → **la interpolación es siempre texto, y nunca se reinterpola**

Tres reglas, y las tres son de seguridad porque la decisión 25 hace del entregable un compilador de
HTML:

1. **Todo valor interpolado se emite como texto escapado** (`&`, `<`, `>`, `"`, `'`), venga del lector
   o del autor. La prosa con marcas entra en el documento por dos sitios y solo por dos: el cuerpo y
   los `say:` de las frases, que se parsean **al compilar**, desde el archivo.
2. **La interpolación no es recursiva.** Si el lector escribe `{note}` en su nota, se imprime
   `{note}`. Lo pide `session-memory` sin pedirlo: su tema es citar al lector.
3. **Un valor de tipo cadena escrito por el lector no puede aparecer en una ranura estructural** —
   `to`, `show`, `id`, `as`, `mark`, `order`, `uses`. En `recover-anchor` esas ranuras llevan
   interpolación (`show: "anchor-body-{item.id}"`), así que la prohibición no puede ser «no
   interpolar ahí»: es **no interpolar ahí un valor que el lector haya podido escribir**.

Esto resuelve de paso la ambigüedad A4 de la primera pasada, que estaba abierta y era peor de lo que
parecía: **los valores de cadena de una isla son datos, no prosa.** Un `label`, un `note` o un campo
de grupo se imprime como texto; si tiene que llevar una marca o variar, se declara como frase y la
prosa la nombra. Es la misma ley que ya usan `names:`, `phrases:` y `slots:`, aplicada al último sitio
que se le resistía.

**Coste:** un escapador de cinco caracteres, y **nunca** construir HTML por concatenación con valores.
Es más barato que la alternativa y es la única opción defendible para algo que compila páginas.

### 5.7 `calamus: 1` → **se borra**

**Recomendación: quitar el campo.** Tres motivos, en orden de peso:

1. **Es una segunda forma de decir lo que el archivo ya dice.** Las islas se cercan con
   ```` ```calamus ````, así que el documento se identifica solo. Un campo que repite lo que la
   sintaxis ya afirma es redundancia en un formato que no se puede romper después.
2. **Un número de versión invita a un lector a negarse**, y la decisión 28 dice que todo falla hacia
   legible. Un lector v1 que se encuentre `calamus: 2` y se pare contradice de frente la regla que
   gobierna el resto del formato; y si no se para, el campo no hace nada.
3. **Es lo único que la v0 no copió de Lexical, y es justo lo que Lexical deprecó.** La compatibilidad
   hacia delante ya la da la retención de claves desconocidas (decisión 28), que es estrictamente
   mejor porque funciona clave a clave en vez de archivo a archivo.

Lo que queda obligatorio en el front matter: **nada**. `title:` es opcional y solo lo necesita quien
imprima el título o lo nombre desde un rastro. `docs/formato-v1.md` §1 dice que un documento válido es
prosa con front matter; sin `calamus: 1` sigue siendo verdad, y además es verdad para un archivo
Markdown cualquiera, que es la propiedad que se quería.

### 5.8 No hay sintaxis de comentario → ya existe, en dos sitios, y no cuesta nada

**Recomendación: `#` dentro de las islas (es YAML, ya funciona) y `<!-- … -->` en la prosa. Y la regla
que faltaba al lado: el HTML crudo no es marcado, es texto.**

La primera pasada dijo que los 19 documentos «no pueden llevar la nota de por qué están escritos
así». Es media verdad y la mitad falsa importa: **dentro de una isla el comentario ya existía.** Los
19 de esta carpeta llevan sus notas ahí, y es donde hacen falta, porque lo que hay que explicar es
casi siempre una declaración. Lo que faltaba de verdad era **una nota en la prosa**, y `<!-- -->` es
Markdown legal, así que no hay sintaxis nueva.

Y va atado a la otra mitad del bloqueador, que la §8 apunta y no desarrolla: **qué pasa con el HTML
crudo.** La respuesta coherente con §5.6 y con la decisión 28 es que se escapa y se imprime como
texto: el lector ve `<script>` en vez de perder el párrafo o ejecutar algo. Falla hacia legible y
cierra el vector de inyección de un golpe. `<!-- … -->` es la única excepción y se descarta.

**Coste para el parser:** un escaneo de dos delimitadores, que puede abarcar varias líneas. Es lo más
barato de este informe.

## 6. Propuestas nuevas, cada una con el ejemplo que se la ganó

Criterio de la decisión 21, igual que la primera pasada: cuatro ejemplos o más entra; uno o dos va
detrás de una ranura o se mide y se aparca. Y una columna que la primera pasada no tenía: **qué le
cuesta a un parser escrito a mano**, porque cero dependencias significa que eso es parte del precio.

| # | propuesta | la gana | coste para un parser a mano |
|---|---|---|---|
| **N1** | **`of:` en una frase**: la frase declara el nombre bajo el que ve aquello sobre lo que se imprime | 5: `evidence-score` (sin escapatoria), `disputed-hour`, `labyrinth`, `redaction`, `column-lab` | Cero sintaxis. En la evaluación, pasar un binding en vez de leer una pila |
| **N2** | **Matar `{n}` y `{list}`**: el caso interpola el nombre que `on:` nombra; la lista unida es un campo de la frase | 19 | Negativo: un caso especial menos |
| **N3** | **`:with{…}` sin hijos como atributos del párrafo** que la contiene (`when`, `weight`, `id`, `voice`, `lang`, `mark`, `live`) | 17 | ~20 líneas, sin mirar adelante |
| **N4** | **Forma en línea `:verbo[etiqueta]{atributos}`**, no `:verbo{…}etiqueta{/verbo}` como escribe la v1 §5 | 13 | Menor con corchetes: el límite de la etiqueta es explícito. Hay que tolerar **salto de línea dentro de `[ ]`**, así que no puede ser una expresión regular de una línea |
| **N5** | **`:mark[…]{as=…}` como cuarto verbo en línea** | 7: `motif-passes`, `footnotes`, `unstable-links`, `two-accounts`, `reader-path`, `narrators`, `document-packet` | Ninguno aparte del verbo. **La v1 §7 legisla su degradación y su §5 no lo define** |
| **N6** | **Disciplina de bitácora en tres ejes**: `keeps: duplicates\|unique`, `removes: none\|last\|any`, `marks: [campo]` | 5: `document-packet`, `footnotes`, `labyrinth`, `contradiction`, `reader-path` | Tres claves, sin sintaxis |
| **N7** | **Una escritura que marca una entrada ya escrita**, con la entrada direccionada por expresión | 1: `reader-path` | Bajo, pero es lo más cerca que el formato llega a un puntero. **Me incomoda y no le encuentro sustituto** |
| **N8** | **`moves:`**: un gesto con nombre y varios efectos (foco, variables, bitácoras, reinicio) | 3: `recover-anchor`, `footnotes`, `document-packet` | Cero sintaxis nueva: es una declaración que un atributo nombra |
| **N9** | **`controls:`**: afordancias de bloque que no son salidas | 8: `reader-path`, `footnotes`, `memory`, `recover-anchor`, `document-packet`, `contradiction`, `session-memory`, `unstable-links` | Una isla más. **La v1 solo tiene afordancias en línea y salidas de nodo**, y «retirar la última línea» no es ninguna de las dos |
| **N10** | **`opens:`** como única forma de declarar el estado inicial, con `opens: { log: <n> }` para una longitud literal | 4: `memory`, `session-memory`, `document-packet`, `labyrinth` | Cero |
| **N11** | **`resets:` con destino literal** | 1: `memory` («olvídame» vuelve a una lectura, no a cero ni a `opens:`) | Cero |
| **N12** | **Un solo espacio de nombres** para `groups`, `logs`, `names`, `phrases`, `variables`, `marks`, `slots`, `moves`; duplicado = error de autoría | 19 | Un mapa y una comprobación. Lo descubrí **colisionando yo mismo** `point` en `two-accounts.md` |
| **N13** | **Un campo puede referenciar un ítem de otro grupo** (`claim: door` → `{item.claim.about}`) | 3: `contradiction`, `footnotes`, `recover-anchor` | Resolución perezosa al imprimir |
| **N14** | **`list:` une con una frase de ítem**, no con un `field:` | 1, y hoy **no se puede escribir**: `meta-editor` | Cero: reusa la maquinaria de frases |
| **N15** | **El esquema lleva un grupo de los spans marcados del propio documento**, como lleva el rastro | 1: `motif-passes` | Un contador durante la emisión |
| **N16** | **`persisted()`** como operador | 1: `session-memory`, cuyo tema **es** la honestidad sobre el medio | Cero: un operador más |
| **N17** | **`reveal: one`** en una región de grupo | 1: `document-packet` | Una línea de estado compartido |
| **N18** | **Salidas compartidas (`also:`)** | 1: `labyrinth`. **Medido aquí**: 12 de las 110 líneas del documento son dos salidas de servicio repetidas seis veces | Cero. Por la decisión 21 **no entra**, pero el coste crece con el tamaño y no se ve en seis habitaciones |
| **N19** | **`unit:` nunca entra en una frase**: `{nombre}` imprime el valor y la unidad la escribe el autor | 2: `column-lab`, `evidence-score` (y el francés, que escribe «72 %» con espacio) | Cero: es una regla, no una función |
| **N20** | **Comentarios**: `#` en las islas (ya funciona) y `<!-- -->` en la prosa; **el HTML crudo se escapa como texto** | 19 | Dos delimitadores |

Y una verificación que la tarea pedía sobre mis propias propuestas: **ninguna mete un nombre en el
espacio del autor.** `of`, `keeps`, `removes`, `marks`, `opens`, `resets`, `also`, `unit`, `reveal` son
**claves de isla**, que son del esquema por construcción; `persisted()` es un operador; y `of: item`
pone el nombre `item` **en manos del autor**, que puede escribir `of: fila`. La única propuesta que
introduce vocabulario cerrado es N6 (`duplicates`/`unique`/`none`/`last`/`any`), y son valores de una
clave del esquema, no nombres de la obra.

## 7. Lo que en la v1 tiene la forma equivocada

Cinco cosas, y tres de ellas son **dos formas de decir una**, que en un formato que no se puede romper
después es peor que una función que falta.

1. **`{n}`** — un nombre del esquema dentro del espacio del autor, y redundante con el nombre que ya
   lleva `on:`. Es el error de la decisión 30 cometido dentro de la construcción que la decisión 30
   manda cerrar primero. **Único arreglo del informe que no es aditivo** (§2.5).
2. **`once: true`** — tercera forma de decir lo que ya dicen el `when:` de la salida y una marca. Se
   borra (§5.5).
3. **`calamus: 1`** — segunda forma de decir lo que dice la cerca ```` ```calamus ````. Se borra (§5.7).
4. **`groups:` y `logs:` como dos claves** — la propia v1 escribe que «una bitácora es un grupo que
   crece». Entonces es `grows:` (o `keeps:`) dentro de `groups:`, no una segunda clave con las mismas
   operaciones. Hoy `count(g where …)` tiene que funcionar igual en las dos, así que **ya son la misma
   cosa** y solo está duplicada la declaración.
5. **El ámbito de una frase no está definido, y la primera pasada lo resolvió sin decirlo** usando
   alcance dinámico (`{seen}` leyendo `exit`). No es una redundancia, es un hueco, y es el que hace que
   `evidence-score` no se pueda escribir (§2.3).

Y dos erratas del propio documento de formato que valen porque tocan el contrato:

- **La v1 §2 escribe la clave en español** (`frases:`, y `cases`/`say`/`is` en inglés dentro). Hay que
  fijar que **las claves del esquema son inglesas** y que lo único traducible es lo que el autor
  escribe. Si no, dos documentos de la misma obra no se pueden leer con el mismo lector.
- **La v1 §5 escribe las directivas en línea con cierre `{/go}`**, que no es la sintaxis que midió la
  decisión 27 (`:go[etiqueta]{…}`). Como el parser es propio, la v1 es libre de elegir — pero entonces
  el precedente de `remark-directive` que justificaba la decisión 27 ya no la respalda, y eso hay que
  saberlo antes, no después (N4).

## 8. Veredicto: ¿lista para un intérprete?

**No hoy. Sí después de una tercera pasada corta, y la lista de lo que la pasada tiene que cerrar es
esta y no es larga.**

La distinción que decide es la de la decisión 22, la misma que salvó a Yarn Spinner del lado
equivocado: **qué rompe prosa y qué no.**

**Hay que cerrarlo antes del intérprete —toca prosa:**

1. **`{n}` se va** (§2.5). Si se escribe prosa con `{n}` y luego se quita, cambian todos los cuerpos
   de caso de todos los archivos a la vez.
2. **`:if` se va y `:with` entra** (§5.1, §5.2). Es sintaxis de párrafo: diecisiete de los diecinueve
   la llevan y ningún documento existente sobrevive al cambio.
3. **La forma de la directiva en línea** (N4): `:verbo[etiqueta]{…}` o `:verbo{…}etiqueta{/verbo}`, pero
   decidido. Trece de los diecinueve llevan al menos una.
4. **`:mark` existe** (N5). Siete lo usan y la §7 ya legisla su degradación, así que la alternativa no es
   «no tenerlo», es tenerlo sin escribirlo.

**Se puede añadir después sin invalidar un archivo:** N1 (`of:` — aunque cuanto más tarde, más
documentos se escriben peor de lo necesario), N6 a N19, y las tres borradas de §7.

Así que la respuesta a la pregunta de fondo —«¿es la forma equivocada alguna de las construcciones
nuevas?»— es: **la frase con casos ordenados tiene la forma correcta y el enlace incompleto**, y esa es
la mejor noticia del informe, porque la forma es lo irreversible y el enlace no lo es. La primitiva de
grupos tiene la forma correcta y le falta declarar su disciplina. Las afordancias en línea tienen la
sintaxis a medio decidir. Y `once:` y `calamus:` no deberían existir.

Con esa tercera pasada escrita, **los 19 archivos de esta carpeta son la suite de conformidad del
intérprete**, y se pueden volver a pasar el día que exista: ya están escritos, ya se sabe cuáles no
deberían compilar, y `route-snapshots` ya se sabe que no es uno de ellos.

## 9. Lo que no hay que tocar, confirmado por segunda vez

- **La decisión 26 aguanta**, verificada sitio por sitio y no heredada (§3.4). Con una condición nueva
  que hay que escribir: aguanta **porque** una bitácora puede declararse única.
- **Las dos puertas** (`requires` en el nodo, `when` en la salida) no solo aguantan: la segunda es lo
  que permite borrar `once:`.
- **La decisión 28 aguanta**, y gana un sitio más: el HTML crudo escapado como texto es «fallar hacia
  legible» aplicado a la seguridad.
- **La isla cercada para datos ricos aguanta.** Todo lo que este informe propone mete más en
  declaraciones y menos en la prosa, igual que la primera pasada.
- **El caso por cláusula entera, sin azúcar de una línea.** Setenta y una cláusulas en tres idiomas y
  ni una excepción; y dos bugs de plural en la propia galería, **en inglés**, que la construcción hace
  imposibles.
