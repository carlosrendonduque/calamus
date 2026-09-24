# Migración de la suite al `formato.md` vigente

> **Por qué este archivo no está dentro de `docs/conformance-v1/`.** Se pidió en
> `docs/conformance-v1/MIGRATION.md`, y ahí no puede estar:
> `tests/parse-conformance.test.ts` hace `import.meta.glob("../docs/conformance-v1/*.md")` y filtra
> **solo** `README.md`, así que cualquier `.md` nuevo en esa carpeta se convierte en un vigésimo
> documento de conformidad y tira tres aserciones (`finds all nineteen`, y el par de `MIGRATION.md`).
> La convención de la carpeta es «todo lo que no sea el README es un documento», y una nota de
> migración no lo es.

> Los 19 documentos se escribieron contra un borrador anterior y la especificación se movió después.
> Esta pasada los reescribe en el formato que prueban, **sin tocar una sola palabra de cara al
> lector**. Medido con el parser (`src/document/parse.ts`): **215 avisos → 149**, 0 errores, y las
> 345 pruebas siguen en verde.
>
> Comprobación de que no se movió prosa: se parsearon las versiones de `HEAD` y las de ahora y se
> compararon todos los títulos, todas las cláusulas `say:`, todas las etiquetas de salida y el texto
> de todos los párrafos. **La única diferencia es el accesor `entry.` → `item.`** (§1.6). Ni una
> palabra cambió.

## 1. Lo que cambió, y por qué

### 1.1 Fuera el número de versión — 19 de 19

`calamus: 1` borrado. §1: «No lleva número de versión. La cerca ```` ```calamus ```` ya dice qué
es». De paso se fue `flow: replace` en `labyrinth`: §7 dice que **un nodo sustituye**, de modo que
no hay modo que declarar.

### 1.2 `logs:` se disuelve en `groups:` — 9 documentos

§4: «Un log es un grupo que crece: **una sola clave**, no dos». Los ocho logs (`trail`, `held`,
`chain`, `readings`, `chosen`, `book`, `jumps`, `route`, `taken`, `read`) pasan a `groups:` con su
disciplina intacta. Los sembrados iniciales pasan de `opens: <log>:` a `opens: logs: { <log>: … }`,
que es donde `Opens.logs` los espera.

### 1.3 `:mark[…]{as=…}` → `:mark[…]{kind=…}` — 11 usos

§6. Ojo con la colisión de nombres que esto deja: `as:` **sigue** siendo la clave correcta dentro de
la declaración `marks:` del front matter, donde nombra el renderizador del registro. El atributo en
línea es `kind`; la clave declarativa es `as`.

### 1.4 Un solo verbo de escritura — 9 usos de `:set`/`:log`, 4 de `:go{move=}`

§8: «`:go{to=}` navega, `:go{show=}` revela, `:do{move=}` escribe». Todas las escrituras en línea son
ahora `:do[…]{move=nombre}`, y **el nombre se declara en `moves:`**, con `writes: [...]` — que es
exactamente lo que `NarrativeDocument.moves` guarda — más el detalle del gesto en el vocabulario del
autor. Seis documentos ganan un bloque `moves:` que antes no tenían (`contradiction`, `memory`,
`reader-path`, `redaction`, `route-snapshots`, `unstable-links`).

Esto **resolvió sin pérdida** los atributos que colgaban del verbo viejo y que el contrato no admite
en una afordancia (`to=toggle`, `control=checkbox`, `note="{…}"`): bajan a la declaración del
movimiento, donde son vocabulario del autor. Y `mark=` se resolvió anidando de verdad —
`:mark[:do[…]{move=…}]{kind=…}` — que es lo que siempre quiso decir y parsea bien (los corchetes
anidan).

### 1.5 `each:` en isla → `:each{of=…}` en línea — 4 de 15 bucles

§4 escribe la región en línea y sin forma de cierre. Se convirtieron los cuatro bucles que la forma
en línea expresa **entera**: `contradiction/statements`, `memory/doors`, `reader-path/places`,
`route-snapshots/nodes`. **Los otros once siguen en isla a propósito** — ver §3.1, que es el hallazgo
principal de esta pasada.

### 1.6 `entry` → `item` — 6 documentos

Consecuencia directa de §4: si un log es un grupo, lo que imprime es un **ítem**, no una entrada.
`src/document/scope.ts` lo confirma: `ACCESSORS = { item, here }`; `entry` no resolvía a nada.
Afecta a `{entry.title}`, `{entry.place}`, `{entry.node}`, `{entry.name}`, `{entry.line}`,
`{entry.note.*}`, `{entry.anchor.label}`, a los `when:` de las marcas de `reader-path` y al `of:` de
la frase `jump-line` de `recover-anchor`.

**Ninguna palabra cambió, pero el `README.md` de esta carpeta sí queda desfasado**: sus tablas de
cláusulas (líneas 210–211) y su prosa (524, 603, 640) siguen diciendo `{entry.…}`. No se tocó el
README porque es el registro de la segunda pasada.

### 1.7 `weight=` → `role=` — 3 usos

`weight=time` (`disputed-hour`), `weight=caption` (`narrators`), `weight=heading` (`recover-anchor`).
`BlockAttrs.weight` es un **número**; lo que los tres querían es lo que `BlockAttrs.role` documenta
literalmente: «A role the author names (`heading`, `caption`, `time`), not a number». Ver §3.4: la
§5 de `formato.md` todavía no lista `role`.

### 1.8 La lista unida se anida — 3 frases

`PhraseDef.list` es `{ of, field, sep, last }`, no cuatro claves sueltas junto a `cases:`.
`contradiction/both-ways`, `meta-editor/house-style`, `unstable-links/closed-behind`.
En `contradiction` se escribe `last: ", and "` porque el componente une así en todas las juntas;
en `unstable-links` **`last:` se deja ausente a propósito** — ver §3.6.

### 1.9 Cada ítem lleva `id:` — 7 grupos

`GroupItem = { id: string } & …`. Se les puso un `id` del autor a `ending-lens/facts`,
`evidence-score/account`, `meta-editor/rules`, `disputed-hour/minutes`, `reader-path/places`,
`unstable-links/turns`, `route-snapshots/nodes`. No se les puso a las entradas sembradas de un log
(`opens: logs:`), porque el id de una entrada de bitácora nace al escribirla, no al escribirse el
documento.

### 1.10 `broken` sube de `groups:` a `names:` — `contradiction`

Una agrupación que cuantifica no es un grupo: su valor es una prueba, no una lista (§4). Y su clave
es `over:`, no `of:`. Se quitó `keep: claim`, que `by: claim` ya dice.

## 2. Las tres faltas reales

1. **`unstable-links`, la coma sin comillas.** `- { is: 1, say: 1 turning left, and not where you
   last saw it. }` truncaba la cláusula en un lector YAML estricto. **Entrecomillada.** Se revisaron
   los 19 en busca de la misma forma: **es la única** `say:` con coma en escalar de flujo sin comillas.

2. **`{` sin comillas en escalar de flujo.** `{` es indicador de flujo y cierra el escalar ahí.
   Encontrados y entrecomillados **siete**, no tres: `labyrinth:22`, `document-packet` (×2),
   `recover-anchor` (×2, en `jump-line`), `meta-editor` (`marks: edited: note: was {part.was}`).
   El resto del corpus ya los llevaba entre comillas.

3. **`session-memory` sin `default:`.** **El documento estaba mal, no la especificación** — pero la
   distinción que hacía era buena y ahora se escribe entera: `default: ""` es lo que la caja tiene
   cuando nunca se escribió nada en ella, y la línea sembrada en la primera visita es otra cosa, que
   vive en `opens: variables: { note: … }`. `Opens.variables` existe exactamente para esto («A
   document may open with … a variable already moved, because a text with no trace cannot show that
   it keeps one»). Las dos claves dicen cosas distintas y el documento necesitaba las dos.

## 3. Lo que se dejó como está, y es hallazgo sobre el formato

### 3.1 `:each{of=…}` en línea no puede escribir once de los quince bucles

Es el hallazgo grande. `Block.each` guarda `body: Block[]` y `empty?: Block[]`; la forma en línea de
la §4 **solo puede dar un párrafo y ninguna rama vacía**, porque el cuerpo es lo que queda del
párrafo que abre la directiva. Se quedan en isla:

| documento | por qué no cabe en línea |
|---|---|
| `disputed-hour/shown` | **tres** párrafos por ítem |
| `document-packet/exhibits` | dos párrafos por ítem, y `reveal: one` |
| `footnotes/chain` | dos párrafos por ítem |
| `recover-anchor/anchors` | dos párrafos por ítem |
| `reader-path/book` | `empty: no lines yet` — **prosa de cara al lector**, y `Block.each.empty` la guarda |
| `unstable-links/taken` | `empty:` con una frase entera |
| `unstable-links/left` | `order: unstable` — **está en `Block.each.order`** y no hay atributo que lo escriba |
| `labyrinth/trail`, `recover-anchor/jumps`, `route-snapshots/route` | `label:`, que es prosa |
| `two-accounts/points` (×2) | `label:` y `heading:`, que son prosa |
| `ending-lens/facts`, `evidence-score/said` | `as: list`, `live: polite` sobre la región |

Dos de esas claves —`order` y `empty`— **ya están en el contrato** y la sintaxis no tiene por dónde
escribirlas. Las demás (`label`, `heading`, `as`, `live`, `current`, `step`, `reveal`) no están en
ninguno de los dos.

### 3.2 No hay dónde etiquetar un control — 15 avisos, 10 documentos

`label`, `control-label`, `option-label`, `control-at`, `step`, `rows`, `clears` sobre una variable.
`VariableDef` no tiene ninguna, y **`label` y `option-label` son texto que el lector lee**: «Column
count», «Read the ending», «Only the minutes they dispute», «reliability», «the editor's hand»…
Borrarlas habría borrado prosa, así que se quedan. `NarrativeDocument.controls` existe como
vocabulario del autor, pero nada lo conecta con una variable.

### 3.3 No hay afordancia de bloque — 8 avisos, 8 documentos

La isla `controls:` («Let them all go», «Close the book», «Forget me», «Put the orchard back»…).
La §8 solo tiene directivas en línea, y `Block` no tiene forma de control. Ocho de diecinueve
terminan en un botón que la prosa no puede llevar dentro.

### 3.4 El parser va por detrás de `types.ts` — ~96 de los 149 avisos

No son dialecto ni hueco: el contrato ya los admite y `parse.ts` todavía no los lee. Se dejan tal
cual **a propósito**, y deberían caer solos:

| aviso | cuántos | dónde está ya en el contrato |
|---|---|---|
| `note`/`resets` en una salida | 19 | `Exit.note`, `Exit.resets` |
| `live=polite` / `live=status` | 17 | `BlockAttrs.live: boolean \| string` |
| `first()`, `last()`, `in()`, `persisted()` | 13 | `Expression` los tiene los cuatro |
| `moves:` en el front matter | 9 | `NarrativeDocument.moves` |
| `marks:` en el front matter | 11 | `NarrativeDocument.marks` |
| `title:` en un nodo | 6 | `NodeDef.title` |
| `when` en `:mark` | 5 | `Inline.mark.when` |
| grupo derivado (`of:`+`where:`) | 5 | `GroupDef.derivedFrom` |
| `role` en `:with` | 3 | `BlockAttrs.role` — **y la §5 de `formato.md` aún no lo lista** |
| `is: true` | 3 | `PhraseCase.is?: number \| boolean` |
| camino de dos puntos | 3 | `Path` ya admite varios |
| `list` en una frase | 3 | `PhraseDef.list` |
| `logs`/`variables` en `opens:` | 3 | `Opens.logs`, `Opens.variables` |
| `visited(exit.to)` por camino | 1 | `Expression.visited.node: Path` |

### 3.5 Huecos que siguen siendo huecos

- **Un campo leído de una llamada**: `last(chain).note`, `last(chosen).door`. `Expression` no tiene
  forma para ello, y `current:`/`last-door:` lo necesitan (2 avisos).
- **Un `enum` cuyas opciones son un grupo**: `of: lenses`, `of: voices`, `of: points`.
  `VariableDef.of` guarda una lista de valores (3 avisos).
- **Un movimiento no admite argumento ni deja nombre al hueco que abandona**:
  `:do[…]{move=down-to item=note id=anchor-mark-note}` en `recover-anchor` (2 avisos). Sin `item=`,
  harían falta dos movimientos idénticos; sin `id=`, `back-up` no sabe adónde devolver el foco.
- **`slots:` no tiene sitio** en `NarrativeDocument` (1 aviso, `meta-editor`).
- **`count(marked-spans of any)`**: `count()` solo toma `where`, y el grupo de spans marcados no
  existe en ningún sitio (1 aviso, `motif-passes` — el N15 de la segunda pasada, intacto).
- **Un `block:`/`pair:` no admite ni `voice`, ni `live`, ni `uses`** (3 avisos). Y `formato.md` no
  dice en ninguna parte **cómo se abre una región**, aunque `Block.region` existe y cuatro
  documentos la necesitan.
- **Nada sostiene prosa de documento junto a nodos**: la ruta de `labyrinth` («Your route so far»,
  impresa sobre todos los nodos) cae en `body`, que el contrato reserva para el caso sin nodos
  (1 aviso).

### 3.6 Dos sitios donde el contrato pide de más

- **`PhraseDef.list.last` es obligatorio** y `unstable-links` demuestra que no debería serlo: el
  componente une con `", "` en todas las juntas y nunca alcanza una conjunción. Se dejó **ausente**,
  que es lo que el documento enseña. Debería ser `last?: string`.
- **`NameDef.grouped.answer`** acaba de aparecer en `types.ts` y `contradiction` lo necesita de
  verdad (`answer: holds`: sin él, `text` difiere en cada cubo y **todos** los cubos se parten).
  **No se escribió**, porque `tests/parse-conformance.test.ts` fija `broken` a exactamente
  `{ over, by, test }` con `toEqual`. Hay que añadir los dos a la vez.

## 4. Antes y después, por documento

| documento | antes | después | |
|---|---:|---:|---|
| `column-lab` | 5 | **4** | −1 |
| `contradiction` | 13 | **7** | −6 |
| `disputed-hour` | 6 | **4** | −2 |
| `document-packet` | 14 | **9** | −5 |
| `ending-lens` | 7 | **5** | −2 |
| `evidence-score` | 8 | **6** | −2 |
| `footnotes` | 16 | **11** | −5 |
| `labyrinth` | 31 | **28** | −3 |
| `memory` | 9 | **6** | −3 |
| `meta-editor` | 9 | **7** | −2 |
| `motif-passes` | 14 | **9** | −5 |
| `narrators` | 8 | **6** | −2 |
| `reader-path` | 11 | **6** | −5 |
| `recover-anchor` | 11 | **9** | −2 |
| `redaction` | 14 | **8** | −6 |
| `route-snapshots` | 7 | **3** | −4 |
| `session-memory` | 7 | **5** | −2 |
| `two-accounts` | 10 | **7** | −3 |
| `unstable-links` | 15 | **9** | −6 |
| **total** | **215** | **149** | **−66** |

De los 149 que quedan, **~96 son retraso del parser** (§3.4) y desaparecerán sin tocar un documento.
Los **~53 restantes son el informe de esta pasada**: la §3 entera.
