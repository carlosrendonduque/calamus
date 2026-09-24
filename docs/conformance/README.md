# Suite de conformidad del formato v0 — resultados

> Método de la decisión 21: escribir los ejemplos como documentos **antes** del intérprete. Se
> intentaron los 19 ids que el análisis previo marcó como «solo esquema» (17) más los dos que
> excluyó (`unstable-links`, `route-snapshots`). Cada `<id>.md` de esta carpeta es el intento, y
> es **un documento, no un informe**: no lleva comentarios dentro, porque el formato no tiene
> sintaxis de comentario (ambigüedad A13). Todo el análisis está aquí.

## 0. Veredicto en tres frases

1. **Con el borrador tal y como está escrito, 0 de 19 son documentos.** No porque falten
   funciones exóticas, sino porque **no existe sintaxis para meter un valor en una frase** ni para
   escribir dos versiones de una frase. Sin eso, `visits()` solo sirve para ocultar párrafos, y
   *ninguno* de los 19 se sostiene. Lo único que el borrador sí expresa hoy es su propio caso
   degenerado: prosa plana.
2. **Con las propuestas de la §2, 18 de 19 son documentos**: 12 enteros y 6 con una entrada de
   registro para la *presentación* mientras todo el contenido sigue dentro del archivo.
   `route-snapshots` no es un documento y no debería intentarlo.
3. **La decisión 26 aguanta.** Cuatro ejemplos hacen aritmética hoy y tres de esas cuatro
   desaparecen en cuanto existen *conteos sobre grupos filtrados* y *casos ordenados*. No añadas
   aritmética. Lo que falla no es la pobreza de las expresiones: es que **el borrador tiene cinco
   primitivas y la suite pide seis** (§2.3).

## 1. Tabla por ejemplo

`E` = exacto con las propuestas de §2. `A` = aproximado: el contenido es documento, la
presentación pide **un nombre** del registro. `N` = no es un documento.

| id | | Lo que hubo que inventar | Lo que se pierde | Ambigüedad que descubrió |
|---|---|---|---|---|
| `redaction` | A | P1, P4 (`:set` en línea), P6 (`when` en la marca), P7 (`as: cover`) | Nada del texto. El truco de que la barra mida exactamente lo tapado es CSS y sobrevive | A2: el control **es** el texto, no un widget en un panel. `control` no dice *dónde* vive |
| `labyrinth` | E | P1, P2, P8 (`back`, `start`, `resets`), P9 (imprimir el rastro), P14 (`also:` para salidas compartidas) | Nada | A4: ¿`label`/`note` son cadenas o prosa? El distintivo «seen» es una frase condicional dentro de un valor de isla |
| `reader-path` | E | P1, P2, P3 (log con campos del autor + `count(g where …)`), P7 | Nada | A8: `struck` marca una entrada **ya escrita**; el rastro de §2.2 no tiene entradas marcables |
| `route-snapshots` | **N** | — | Todo el mecanismo | Necesita rastros guardados como valor, selección de dos, comparación posicional y un índice de divergencia. No es «una ranura de expresión»: es una estructura de datos que el formato no tiene, **más** una ranura que escribe de vuelta |
| `unstable-links` | A | P3, P8, `order: unstable` (un nombre del registro, no una expresión) | El pivote `1 + ((step*5) % (n-1))` exacto. No importa: lo autoriado es «el orden es inestable», no ese módulo | Choque entre la decisión 21 (una función para un ejemplo va detrás de ranura) y la 23 (la navegación vive en el documento): una función de navegación de un solo ejemplo **no tiene dónde ir** |
| `footnotes` | E | P1, P2, P3, P9 (`depth` como valor y `--step` por entrada) | Nada | A8bis: este log **sí** borra (`Back up one note`); `reader-path` **no** puede. Los logs necesitan declarar cuál son |
| `recover-anchor` | E | P1, P2, P4 (`show`/`focus`), P5 (movimientos declarados) | Nada | A10: un movimiento tiene **tres** efectos a la vez (foco, variable, log). Con atributos solo-cadena, eso obliga a declararlo fuera de la prosa |
| `document-packet` | E | P1, P2, P3, P8 (`first(unread)`), regiones reveladas | Nada | A3: ¿qué **es** un nodo al renderizar? Aquí los tres «nodos» se revelan en sitio; en `labyrinth` reemplazan la página. El borrador no lo dice |
| `memory` | E | P1, P2, P3, `starts:` en un log | Nada | A6: abre **a mitad de lectura** a propósito (`readings = 2`, una puerta ya abierta). Ningún diseño del estudio permite declarar un rastro inicial no vacío |
| `session-memory` | A | P11 (`type: string`, `persist:`, `control: text`) | La tercera rama: «este navegador no guardará nada». El documento no puede conocer el entorno. **Sí importa**: es el ejemplo cuyo tema es la honestidad sobre el medio | A12: interpolar texto **escrito por el lector** dentro de la prosa. No hay regla de escapado en ninguna parte del borrador |
| `narrators` | E | P1, P2, P3, `voice:` como clave semántica | Nada | A4 otra vez: la etiqueta del control se construye con `{item.who}` |
| `motif-passes` | E | P6, P7 (marcas declaradas por el autor con su nota accesible), P3 | Nada | El borrador **filtra ontología**: `kept`/`struck` son palabras de *esta* obra y §2.3 las pone en el esquema |
| `two-accounts` | A | P3 (dos grupos con campos del autor) | La maquetación en dos columnas paralelas | A11: las regiones **no anidan**, y dos columnas lado a lado son exactamente un nivel de anidamiento |
| `disputed-hour` | E | P1, P2, P3 (grupo derivado con filtro por variable) | La semántica `<dl>` de las dos fuentes; los rótulos pasan a prosa. No importa | Ninguna nueva; es el caso más limpio para el grupo |
| `contradiction` | E | P3 con `by:` + `test: split`, P2 con `list:`/`sep:` | Nada | **La única concesión del borrador está mal escrita**: `some(claims where holds) and some(claims where not holds)` es cierto con dos afirmaciones de *claims distintos*. El choque real exige cuantificar dentro de cada grupo (§3.1) |
| `evidence-score` | E | P3 (comparar variable contra **campo del ítem**), P2 | Nada | A5: `unit: "%"` — ¿la custom property lleva unidad? El readout dice `72%` y el CSS necesita `72` |
| `meta-editor` | A | P11, P12 (ranura en línea que referencia una tabla declarada) | Nada del contenido: las reglas se quedan en el documento | A9: la decisión 27 dice «datos ricos → bloque; en línea → cadenas». Una **variación en línea que necesita datos ricos** no tiene sitio. Es el hueco de la 27 |
| `ending-lens` | E | P1, P2, P3, `of: <grupo>` en un enum | Nada | Ninguna. Es el más limpio de los 19 |
| `column-lab` | A | P10 (`control: choice`, `step`, `unit`), P13 (región que porta variables de superficie) | Nada | A11 y A5: el «fácil» rompe la decisión 27, porque necesita la **tercera granularidad** (un bloque envolvente) que la 27 descartó |

Recuento: **E = 12** (`labyrinth`, `reader-path`, `footnotes`, `recover-anchor`, `document-packet`,
`memory`, `narrators`, `motif-passes`, `disputed-hour`, `contradiction`, `evidence-score`,
`ending-lens`) · **A = 6** (`redaction`, `unstable-links`, `session-memory`, `two-accounts`,
`meta-editor`, `column-lab`) · **N = 1** (`route-snapshots`).

## 2. Propuestas, en orden de prioridad

El criterio: cuántos de los 19 la ganan. Cuatro o más = entra. Uno o dos = ranura, por la
decisión 21. Todas respetan la 26 (cero aritmética) y la 27 (atributos en línea con forma de
cadena), salvo donde se dice lo contrario y en voz alta.

### P1 — Interpolación `{nombre}` · la gana **todo** (17 de 19)

No existe. Hoy no hay forma de escribir «Has estado aquí 3 veces» ni «{cols} up». §5 del borrador
lo llama «la pluralización y unir listas no tienen sintaxis»; es peor: **no hay sintaxis para
poner un número en una frase.**

Regla que lo mantiene pequeño y no lo convierte en un lenguaje de plantillas: **entre llaves va
un nombre, nunca una expresión.** Las expresiones viven en declaraciones (`names:`), y el cuerpo
solo las nombra.

```yaml
names:
  lines: count(standing)
  here: last(standing)
```

`{lines}`, `{here.place}`, `{item.title}`, `{entry.direction}`. Nombre desconocido → se imprime
`{nombre}` literal: nunca se pierde prosa, y el autor ve el error (decisión 28).

### P2 — Frase con casos ordenados · la gana **todo** (17 de 19) y **es la pieza central**

Una frase declarada con nombre y **casos ordenados**, cada uno con prosa entera. Es a la vez:

- la frase que le cuenta al lector lo que ha hecho (14 de los 19 la llevan), y
- **la primitiva «variante» que el borrador perdió** (`arquitectura-v2.md` §6.3 la pide; la §2.3
  del borrador no la tiene). La necesitan `memory` (4 aperturas), `narrators` (3 voces),
  `ending-lens` (3 finales), `evidence-score` (plano/matizado), `redaction` (tapado/revelado),
  `recover-anchor` (3 estados), `disputed-hour` (agreed/disputed).

```yaml
phrases:
  standing:
    on: lines                 # el número sobre el que se elige el caso
    cases:
      - is: 1
        say: 1 line standing
      - say: "{lines} lines standing"
```

Tres clases de caso, evaluadas en orden, primera que acierta: `is: <entero>`, `when: <expresión>`
y el último sin clave (`other`). `is: 1` es azúcar de `when: n == 1`, así que el mecanismo es
**uno**. Dentro de un caso, `{n}` es el número sobre el que se eligió: el único nombre reservado
del formato.

Unir listas, en la misma declaración:

```yaml
  closed:
    list: taken            # el número de casos es la longitud de la lista
    field: turn.name
    sep: ", "
    last: ", and "         # opcional; si falta, `sep` se usa en todas las juntas
    cases:
      - is: 0
        say: ""
      - say: "Closed behind you: {list}."
```

**La librería nunca elige una conjunción.** Prueba de que eso no es pereza: en español «y» pasa a
«e» ante palabras que empiezan por i-/hi-, así que cualquier conjunción automática es incorrecta
la mitad de las veces. El separador es literal y es del autor. (Nota adversarial: el código real
de `contradiction` usa `", and "` *también* entre el primero y el segundo, produciendo «A, and
B»; el formato debe poder reproducir eso, luego `last` es opcional y `sep` es el que manda.)

Pluralización: §3.2 la desarrolla en los dos idiomas, porque es donde el diseño se decide.

### P3 — Grupo declarado por el autor · la gana **14 de 19** · es la **sexta primitiva**

El borrador la asoma una vez, en §2.5, como «la única concesión» que se ganó el detector de
contradicciones. No es una concesión: es la forma de la que están hechos catorce de los
diecinueve ejemplos.

```yaml
groups:
  minutes:
    fields: [time, gate, warden, agrees]     # los nombres son del autor
    items:
      - { time: "03:14", gate: "Door six opened.", warden: "Nothing to report.", agrees: false }
  shown: { of: minutes, where: not agrees or not only-disputed }   # derivado
logs:
  book:
    fields: [place, struck]
    append-only: true
```

Cuatro operaciones, y **el esquema solo aporta operadores**: `count(g where …)`,
`some(g where …)`, `first(g)` / `last(g)`, `in(log, item)`. Más una región que imprime un grupo
(`each:`), cuyo cuerpo es prosa con `{item.campo}`.

Esto es lo que resuelve la fuga de ontología que la tarea avisa: en `two-accounts` los nombres
`transcript` y `log` son **nombres de grupo declarados en el front matter de ese documento**, y en
`disputed-hour` `gate`/`warden`/`agrees` son **campos declarados por el autor**. El esquema no
sabe qué significan. Contrasta con el propio borrador, que sí filtra: §2.3 fija `kept` y `struck`
como semántica del esquema, y esas dos palabras son la ontología de *Motifs.tsx* (P7 lo corrige).

Un log es un grupo que crece, y **el rastro de nodos es simplemente el log que el esquema
mantiene gratis.** Con eso, ocho necesidades distintas de «lista» pasan a ser una primitiva:
el rastro de `labyrinth`, el libro de `reader-path`, el registro de saltos de `recover-anchor`,
las hojas abiertas de `document-packet`, las puertas de `memory`, la cadena de `footnotes`, los
giros tomados de `unstable-links` y las afirmaciones sostenidas de `contradiction`.

**Y preserva la decisión 26:** contar es *añadir a un log*, no sumar. `memory` incrementa
«lecturas» con `:log[Read it again]{add=readings}` y lee `count(readings)`. Aritmética cero.

Dos operadores más, ambos pequeños y ambos ganados:

- `where` puede comparar una variable contra un **campo del ítem** (`trust >= keep`). La gana
  `evidence-score`, y es lo que evita que los umbrales se conviertan en aritmética.
- un grupo derivado puede **agrupar y testear dentro del grupo**: `by: claim`, `test: split`. La
  gana `contradiction`, y es lo que arregla la concesión mal escrita del borrador (§3.1).

### P4 — Afordancia en línea · la gana **8 de 19** · es la que decide qué clase de formato es esto

En el borrador **todas las salidas viven dentro de una isla YAML**. Un formato de hipertexto que
solo puede poner enlaces en un bloque de configuración es un formato en el que no se puede
escribir *afternoon*. Y medido sobre estos 19: **solo dos** (`labyrinth`, `route-snapshots`)
navegan de verdad reemplazando la página; los demás **revelan en sitio**. Es decir, la
arquitectura ya dijo en su §5 que el grafo no es el centro, y el borrador le dio afordancias solo
al grafo.

Tres verbos en línea, hijos siempre visibles (decisión 28), atributos con forma de cadena
(decisión 27):

```markdown
:go[Take the stairs down]{to=stairs}
:go[note 4.2]{show=body-note focus=yes}
:set[the inside]{var=door to=toggle mark=withheld unless=door}
:log[Cross to {item.place}]{add=book place="{item.place}"}
```

`to` acepta un nodo o uno de un conjunto cerrado de destinos relativos (P8). `show` revela y
lleva el foco sin navegar — es «un regreso que lleva el foco», que `arquitectura-v2.md` §6.4 pide
y el borrador no tiene.

### P5 — La isla es una cabecera; la prosa de después le pertenece · la gana **todo**

Es la ambigüedad que el borrador nombra como «la más peligrosa» y tiene una respuesta con
precedente: **todos los formatos que sobrevivieron delimitan con una línea de cabecera, no
anidando** — `::title` de Twine, `=== knot ===` de Ink, `title:/---/===` de Yarn. Así que:

- una isla `node:` / `each:` / `block:` / `pair:` **abre** una región;
- la región termina en `end`, en la siguiente isla del mismo nivel, o en el final del archivo;
- las regiones **no anidan** salvo dentro de un contenedor que lo diga (`pair:`, `block:`).

Corolario que hay que escribir: el título de un nodo es **dato** (`title:` en la isla), no un
encabezado de prosa, porque el rastro impreso tiene que poder nombrarlo (`{entry.node.title}` en
`labyrinth`).

### P6 — `when` / `unless` en una directiva en línea · la gana **4** (`motif-passes`, `redaction`, `meta-editor`, `evidence-score`)

Gobierna **el tratamiento, no el texto**: los hijos se renderizan siempre. Es el contrato de
degradación de la decisión 28 convertido en una función de autor: apagar una pasada de marcado no
quita palabras, quita marcas.

### P7 — Las clases de marca las declara el autor · la gana **3** y **arregla una fuga del esquema**

```yaml
marks:
  withheld: { as: cover, note: "withheld; select to reveal" }
  struck:   { as: strike, note: withdrawn }
```

El autor pone el **nombre** (`withheld`, `struck`, `door`) y la **frase accesible**; el esquema
aporta solo la degradación: un `as:` que el renderizador no conozca se renderiza como texto
plano. Con eso `as:` queda **abierto** (el registro lo resuelve) y el esquema no se queda con
`kept`/`struck`, que son de una obra concreta. Nota incómoda que hay que decidir: `redaction`
necesita `as: cover` — o entra en el vocabulario que el registro reconoce, o **el ejemplo de
portada de calamus, el primero que se ve por la decisión 20, no es un documento.**

### P8 — Destinos relativos y reinicio · la gana **8 de 19**

`to: back`, `to: start`, `to: first(unread)`, y `resets: <log>` (`$ResetAction` de Storyspace).
Ocho de los diecinueve llevan un «volver», un «cerrar» o un «olvidarme»: `labyrinth`,
`footnotes`, `document-packet`, `memory`, `reader-path`, `recover-anchor`, `unstable-links`,
`contradiction`. Advertencia honesta: en la galería esos botones viven en `playground__case-controls`
junto a controles de demostración, así que parte de esto es andamiaje. Aun así el reinicio entra,
porque un hipertexto que no puede ofrecer «empezar otra vez» no puede publicar *afternoon*.

### P9 — Los hechos del rastro son valores, y se imprimen · la gana **4**

`depth`, `step`, los campos de la entrada, y **custom properties por entrada** (`--step`,
`--depth`). `footnotes` sangra cada nota por su profundidad: eso es `--step` en CSS, no
aritmética en JS, exactamente por el mismo argumento que §2.1 usa para `weight`. El borrador
emite custom properties solo para variables.

### P10 — Vocabulario de controles, con sitio y con unidad · la gana **8**

`control:` necesita un conjunto cerrado —`range`, `choice`, `toggle`, `text`— más `step`, `unit`,
`label`, `control-label` y `option-label`. Y necesita decir **dónde vive el control**: en un
panel (`column-lab`, `evidence-score`) o **dentro de la prosa** (`redaction`). Hoy `control` dice
solo «si el lector puede moverla», que es la mitad de la pregunta.

### P11 — `type: string`, `type: list`, `persist:` · la gana **3**

`arquitectura-v2.md` §6.1 pide «número, booleano, enum, cadena, lista; opcionalmente
persistida». El borrador se dejó **cadena, lista y la persistencia** por el camino, y §5 solo
echa de menos la última.

### P12 — Una ranura en línea puede referenciar una tabla declarada · la gana **2**, y **cierra el hueco de la decisión 27**

```markdown
:slot[{line}]{name=rewrite with=rules when=editing mark=edited counts=edits}
```

La 27 reparte por capacidad de carga: datos ricos → isla; en línea → cadenas. `meta-editor`
demuestra el caso que se cae entre las dos: una **variación en línea** cuyo parámetro es una
**tabla ordenada de sustituciones**. La ley general que lo resuelve sin romper la 27 es la que ya
usan P1, P2, P4 y P5: **los datos ricos viven en una declaración y la prosa solo los nombra.**

### P13 — Bloque envolvente para variables de superficie · la gana **2** (`column-lab`, `two-accounts`)

La tercera granularidad que la decisión 27 descartó. `column-lab` no puede aplicar `--cols` al
documento entero: gobierna **un bloque**. Y `two-accounts` necesita dos regiones lado a lado. Es
el ejemplo «fácil» el que rompe la 27, que era la predicción del método.

### P14 — Salidas compartidas · la gana **1**, y es deuda de autoría, no función

`labyrinth.md` repite las mismas dos salidas de servicio en seis nodos: 24 líneas de YAML
duplicado en un documento de 128. Con `exits:` nombrado en el front matter y `also: wayback` en
el nodo, son 4 líneas. Por la regla de la 21 esto no entra por un ejemplo — pero conviene medirlo
ahora, porque el coste crece con el tamaño del documento y **no se ve en ejemplos de seis
habitaciones.**

## 3. Los dos sitios donde el borrador está equivocado, no incompleto

### 3.1 La única concesión de §2.5 no expresa el ejemplo que la ganó

El borrador escribe:

```
some(claims where holds) and some(claims where not holds)
```

y dice que se la ganó el detector de contradicciones. El código real de `Contradiction.tsx` hace
otra cosa:

```js
Object.keys(CLAIMS).filter((claim) => {
  const answers = held.filter((s) => s.claim === claim);
  return answers.some((s) => s.holds) && answers.some((s) => !s.holds);
})
```

Primero **agrupa por `claim`** y luego cuantifica **dentro de cada grupo**. La expresión del
borrador es cierta en cuanto el lector sostiene dos afirmaciones cualesquiera de signo contrario,
aunque respondan a preguntas distintas — es decir, **declara una contradicción que no existe.**
Escribirla bien pide cuantificación anidada, que es exactamente el «lenguajito» que la decisión
26 quiere evitar. La salida que respeta la 26 es mover la forma a una declaración y dejar que el
esquema aporte el operador:

```yaml
groups:
  broken:
    of: chosen
    by: claim        # campo del autor
    test: split      # operador del esquema: el grupo contiene los dos valores de verdad
    keep: claim
```

El cuerpo queda plano (`count(broken) > 0`) y el autor no escribe un cuantificador anidado nunca.
Es además el precedente de articy que la §7ter cita: **el esquema viaja dentro del documento.**

### 3.2 La frase dirigida al lector: el diseño, probado en dos idiomas

Las frases reales de los 19 (recogidas literalmente del código) piden cinco cosas: interpolar un
conteo; **elegir entre formas plurales**; un caso **cero** que suele ser otra frase entera;
**unir una lista**; y ramificar por estado. Y una sexta que no se ve mirando solo el inglés.

Lo que **no** funciona: sufijos. El patrón que 22 de 32 ejemplos escriben a mano es
`line${n === 1 ? "" : "s"}`, y cualquier sintaxis que lo imite —`line{s}`, `{n|line|lines}`—
muere en español en la primera frase, porque **lo que cambia no es el final del sustantivo: es el
verbo, y va delante del número.**

Español, `reader-path`, con `lang: es`:

```yaml
phrases:
  en-pie:
    on: lineas
    cases:
      - is: 0
        say: No queda ninguna línea en pie
      - is: 1
        say: Queda una línea en pie
      - say: Quedan {lineas} líneas en pie
  vueltas:
    on: vueltas
    cases:
      - is: 1
        say: una vez
      - say: "{vueltas} veces"
  informe:
    cases:
      - when: count(libro) == 0
        say: >-
          El libro está abierto y vacío. Nada de lo que escribas en él podrá
          sacarse después.
      - say: >-
          {en-pie}, {tachadas} tachadas. El libro te sitúa en {aquí.lugar}
          {vueltas}.
```

Rinde: «Queda una línea en pie, 0 tachadas…» / «Quedan 3 líneas en pie, 1 tachadas…»

Cuatro cosas que ninguna plantilla de sufijos puede hacer y que aquí salen gratis, porque el caso
es **una oración entera**: `Queda`/`Quedan` (número del verbo, **antes** del sustantivo),
`ninguna`/`una` (género), `vez`/`veces` (cambio de raíz), y `tachadas` concordando en femenino
plural **a diez palabras del número que lo decide**.

Inglés, el mismo documento, mismo mecanismo:

```yaml
phrases:
  standing:
    on: lines
    cases:
      - is: 1
        say: 1 line standing
      - say: "{lines} lines standing"
  report:
    cases:
      - when: count(book) == 0
        say: >-
          The book is open and empty. Nothing you write in it can be taken out
          again.
      - say: "{standing}, {crossings} struck. The book has you in {here.place} {returns}."
```

Y `labyrinth`, en los dos, con el caso singular que el React **no tiene** (solo renderiza cuando
`visits > 1`, así que el bug de «1 times» nunca se vio):

```yaml
# en
stood: { on: visits(here), cases: [ { is: 1, say: You have stood here once. },
                                    { say: You have stood here {n} times. } ] }
# es
parado: { on: visits(here), cases: [ { is: 1, say: Has estado aquí una vez. },
                                     { say: Has estado aquí {n} veces. } ] }
```

Francés, que importa porque dos de los tres corpus de la demo son franceses: el caso `is: 0` toma
**singular** («0 tournant reste»), y sale del mismo sitio sin ninguna regla en la librería.

**Coste, dicho en voz alta.** Este diseño no tiene azúcar de una línea, y en español **no puede
tenerla**: si el caso tiene que poder variar el verbo, tiene que abarcar la oración. Así que una
frase con dos plurales se escribe como prosa con dos nombres dentro (`{en-pie}, {tachadas}
tachadas…`), y los plurales viven declarados y reutilizables. Es más largo que
`line${s}` — y es lo que hace que el mismo documento funcione en tres idiomas.

**Límite, también en voz alta.** Casos por entero exacto más `other` cubren en/es/fr/de/it/pt. No
cubren las **bandas** plurales del polaco o el ruso (2–4 frente a 5+), porque la regla real va
sobre `n mod 10` y el módulo es aritmética, prohibida por la 26. Escape limpio y coherente con la
filosofía de ranura: **el selector de plural es él mismo un nombre del registro**
(`plural: pl` en el front matter), con `exact` por defecto. Cero dependencias mientras nadie lo
pida, y CLDR no entra nunca en el paquete.

## 4. Ambigüedades — el hallazgo más peligroso, porque se resuelven en silencio

| # | Ambigüedad | Las dos lecturas defendibles |
|---|---|---|
| A1 | **`:if[expr]` es ilegal en su propia gramática.** La decisión 27 elige dos granularidades: isla cercada y **en línea**. `:if[…]` en su propia línea *es* una directiva en línea, así que parsea como un párrafo que contiene una directiva — no como un modificador del párrafo siguiente. Y mete una **expresión en la ranura de hijos**, que es Markdown en línea: un `*`, un `_` o un `[` dentro de la expresión se destruyen | ¿ámbito = el párrafo siguiente, hasta la línea en blanco, hasta el próximo `:if`, o el resto de la sección? Los cuatro son defendibles. Arreglo: `:with{when="…"}` como primera directiva **sin hijos** de un párrafo, definida como atributo de ese párrafo |
| A2 | **`weight`, `id`, `voice`, `lang` no tienen dónde escribirse.** §2.1 dice que «un fragmento puede llevar `weight`» y en toda la §2.3 **no hay sintaxis para dar ningún atributo a un párrafo** | O existe una directiva de atributos de párrafo, o `weight` no es una función: es una nota |
| A3 | **Qué es un nodo al renderizar.** El borrador define `node`, `requires` y `exits` y **nunca dice qué pasa al entrar** | ¿Página que sustituye (`labyrinth`) o región que se revela en sitio (`document-packet`, `footnotes`)? Con la primera lectura `visited()` y el rastro significan una cosa; con la segunda, otra |
| A4 | **Los valores de cadena de una isla: ¿datos o prosa?** `label`, `note`, `option-label` | Si son datos, el distintivo «seen» de `labyrinth` y los rótulos de `narrators` y `motif-passes` son inexpresables. Si son prosa, cada valor de YAML es un punto de parseo de directivas e interpolación |
| A5 | **Custom properties: alcance y unidad.** §2.1 dice «toda variable se emite como custom property» | ¿En la raíz o en la región? `column-lab` necesita lo segundo. Y `gutter: 28` no es válido para `column-gap`: falta `unit: px`. El readout dice `28px`, el CSS necesita `28px`, el control necesita `28` |
| A6 | **Dónde empieza la lectura, y con qué rastro.** El borrador lo predice a medias | Pero la mitad que no predice es peor: `memory` y `session-memory` **abren a mitad de lectura a propósito**, así que un documento tiene que poder declarar un rastro inicial no vacío (`starts:`). Y: ¿el nodo de arranque cuenta ya una visita? En `labyrinth` `visits(platform)` vale 1 antes de que el lector toque nada |
| A7 | **`once: true`** | ¿La salida desaparece (`unstable-links`) o queda visible e inerte con su marca (el «seen» de `labyrinth`, el «opened» de `document-packet`)? Las dos son defendibles y producen obras distintas |
| A8 | **Los logs: ¿se puede quitar de ellos?** `reader-path` prohíbe borrar y **marca** la entrada retirada; `footnotes` hace `pop` en cada «back up one note» | Tiene que declararse por log (`append-only:`), y §2.2 no tiene ni entradas marcables ni borrado. `arquitectura-v2.md` §6.2 sí pedía «entradas marcables pero no borrables» |
| A9 | **`requires` que sale falso** | ¿El nodo es inalcanzable (las salidas hacia él se ocultan), visible pero rechazado, o se entra y se degrada? La decisión 28 legisla la expresión que *no evalúa*, no la que evalúa a falso |
| A10 | **Un efecto o varios.** Un salto de `recover-anchor` mueve el foco, escribe una variable y añade al log, todo de una | Con atributos solo-cadena hay que declararlo fuera (`moves:`) o admitir atributos estructurados en línea, que es justo lo que la 27 midió como imposible |
| A11 | **¿Anidan las regiones?** | `two-accounts` y `column-lab` necesitan exactamente un nivel. Si no anidan, son ranuras; si anidan, hay que decir cómo se cierran |
| A12 | **Interpolar texto del lector.** `session-memory` cita al lector dentro de la prosa | No hay ni una palabra sobre escapado en el borrador. Y como la decisión 25 hace del entregable un compilador a HTML, esto es una decisión de seguridad, no de estilo |
| A13 | **No hay sintaxis de comentario**, y tampoco se dice qué pasa con el HTML crudo, que Markdown permite | Se descubrió escribiendo esta carpeta: los 19 documentos no pueden llevar dentro la nota de por qué están escritos así. Todo formato de autoría tiene comentarios |
| A14 | **`calamus: 1` no tiene semántica.** Es el único campo obligatorio aparte del título | ¿Qué hace un lector v1 con `calamus: 2`? La decisión 28 ya da compatibilidad hacia delante reteniendo claves desconocidas, y `arquitectura-v2.md` §7bis registra que **Lexical deprecó su propio campo `version` precisamente porque eso es estrictamente mejor.** El borrador lo copia todo de Lexical menos esa parte |
| A15 | **Re-serialización.** La decisión 28 exige round-trip byte a byte de lo desconocido | Nada dice el orden canónico de claves, si pueden haber dos islas con el mismo `node:`, ni si una isla puede aparecer a media frase |

## 5. Veredicto sobre la partición de 17

La partición acertó en el número aproximado y **falló en la pertenencia**, y falló en las dos
direcciones:

- **`unstable-links` no necesita una ranura de expresión.** Necesita **un nombre**:
  `order: unstable` sobre la región que imprime las salidas restantes. El módulo del pivote no es
  contenido autoriado; lo autoriado es «el orden es inestable». Y como el orden de las opciones es
  estructura (decisión 23) y no puede irse a una ranura de componente, la forma correcta es que
  `order:` tome un nombre que **el registro resuelve** — una ranura escrita como atributo. Eso
  reconcilia la 21 con la 23, que es el único choque estructural que la suite encontró.
- **`route-snapshots` no es un documento**, y la partición fue demasiado suave al llamarlo «le
  falta una ranura de expresión». Le faltan cuatro cosas: rastros guardados como **valor**, una
  selección de dos entre ellos, una comparación **posicional** de dos listas, y el índice de la
  primera divergencia (más `part + 1`, aritmética). Y la ranura tendría que **escribir de vuelta**
  en el documento, que es la pregunta abierta nº 3 del borrador. Es el ejemplo que hay que usar
  para diseñar el contrato de escritura de las ranuras, no para estirar el esquema.
- Y la partición contaba «solo esquema» como una sola cosa, cuando son tres: **contenido
  entero en el documento** (12), **contenido en el documento + un nombre del registro para la
  presentación** (6: `redaction`→`cover`, `column-lab`→bloque de columnas,
  `two-accounts`→columnas paralelas, `unstable-links`→`unstable`, `meta-editor`→`rewrite`,
  `session-memory`→persistencia), y **no es documento** (1).

Lo tranquilizador: en los seis de grado A, **lo que se va al registro es presentación o un
operador, nunca prosa ni un nombre de la obra.** La distinción de la §3 del borrador —los 32
ejemplos son entradas del registro, no documentos— aguanta la prueba.

## 6. Lo que la arquitectura ya había extraído y el borrador perdió

No es opinión: `arquitectura-v2.md` §6 lista las cinco primitivas con sus exigencias, y el
borrador es una proyección incompleta de su propio análisis. Falta:

| De `arquitectura-v2.md` §6 | Estado en `formato-v0.md` | Quién lo pide |
|---|---|---|
| Fragmento con **variantes** (6.3) | No existe | 7 de los 19 (P2) |
| Rastro con **entradas marcables** (6.2) | No existe | `reader-path` (A8) |
| **Profundidad como valor** (6.4) | No existe | `footnotes` (P9) |
| **Un regreso que lleva el foco** (6.4) | No existe | `recover-anchor` (P4) |
| **Sustitución ordenada** (6.5) | No existe | `meta-editor` (P12) |
| **Plantillas con pluralización** (6.5) | Reconocido como hueco en §5 | 14 de los 19 (P2) |
| Variable **cadena** y **lista** (6.1) | No existen | `session-memory`, `meta-editor` (P11) |

## 7. Lo que no hay que tocar

- **La decisión 26 aguanta.** Los cuatro sitios con aritmética real son
  `entries.length - kept.length` (`reader-path`), `part + 1` (`route-snapshots`), el módulo del
  pivote (`unstable-links`) y el `Math.min` de la escalera de aperturas (`memory`). Tres se
  disuelven con conteos sobre grupos filtrados y casos ordenados; el cuarto es presentación. Y
  `evidence-score`, que es el que más tienta —tres umbrales y un dial de 0 a 100— **no necesita
  ni una suma.** Comparar variable contra campo del ítem basta.
- **El contrato de degradación de la decisión 28 sobrevive las 19 pruebas** y de hecho se gana una
  función: P6, que es la degradación convertida en herramienta de autor.
- **La isla cercada como forma de los datos ricos** aguanta. Todo lo que este informe propone
  mete *más* en declaraciones y *menos* en la prosa, que es la dirección que la 27 ya había
  medido.

## 8. Si solo se cambia una cosa antes del intérprete

**La frase con casos, y su forma exacta.** No porque sea el hueco más grande —que lo es, 17 de
19— sino por el criterio de la decisión 22: es **el único de estos huecos cuyo arreglo tardío
rompería archivos de prosa ya escritos.** Las afordancias en línea, el reinicio, los grupos, la
profundidad: todo eso se puede añadir después y ningún documento existente deja de valer. Pero si
se despacha la pluralización con azúcar de sufijos —`line{s}`, `{n|singular|plural}`— y luego
llega el primer documento en español, donde lo que cambia es el verbo y va delante del número,
hay que cambiar la sintaxis **de la frase que más se escribe en el proyecto**, en todos los
archivos a la vez. Eso es exactamente el v1→v2 de Yarn Spinner, y el lado de la prosa no se puede
romper dos veces.

Así que: **un caso es una oración entera, se eligen en orden, y la librería no lleva reglas de
plural.** Se puede escribir hoy, antes del intérprete, y se puede probar con los 19 archivos de
esta carpeta.
