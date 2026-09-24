# Formato del documento narrativo

> Especificación viva. Sustituye a `formato-v0.md` y `formato-v1.md`, que quedan en el historial
> de git como registro de lo que se probó y falló.
>
> **Dos pasadas de conformidad contra 19 ejemplos reales, antes de escribir un intérprete.** La v0
> sacó 0 de 19; la v1 también sacó 0 literal y 18 con propuestas. Lo que sigue es lo que sobrevivió
> a las dos. Los 19 documentos viven en `docs/conformance/` y `docs/conformance-v1/` y **son la
> suite de conformidad del intérprete**.

## 1. Forma general

```markdown
---
title: El pasillo
---

Hay un pasillo que no conduce a ninguna puerta.
```

Documento válido y completo: el `ReaderContent` de hoy, y la decisión 22 hecha carne.

**No lleva número de versión.** La cerca ```` ```calamus ```` ya dice qué es, y un número invita a
un intérprete a negarse a leer — contra la decisión 28, que manda fallar hacia legible. Lexical
deprecó su propio campo `version` por esto mismo.

**Comentarios:** `#` dentro de las islas, `<!-- -->` en la prosa. El HTML crudo se escapa como
texto, nunca se interpreta.

## 2. La frase con casos

El centro del formato, y lo único que no se puede cambiar después.

```yaml
phrases:
  standing:
    on: lines
    cases:
      - { is: 0, say: No queda ninguna línea en pie }
      - { is: 1, say: Queda una línea en pie }
      - {        say: "Quedan {lines} líneas en pie" }
```

Casos ordenados, gana el primero. `is: n` es azúcar de `when: x == n`. Cada caso es **una cláusula
entera**, nunca una raíz con sufijo.

**Validado, no supuesto:** 8 ataques sobre 90 líneas de cara al lector, 71 cláusulas, en español,
inglés y francés. Sobrevivió a dos números en una cláusula, `vez/veces`, `ninguna/una`, concordancia
a diez palabras del número, el caso cero como oración distinta, `tient/tiennent`, `rayée/rayées`.

Y hace imposibles dos bugs que **están hoy en la galería publicada**: `1 turning left… you last saw
them`, y un `1 times` que solo se evita con un guardián que esconde la frase en la primera visita.

### El ámbito, que es donde sí fallaba

Una frase no llevaba ámbito. `evidence-score` necesita `when: trust >= item.floor` — variable viva
contra campo del ítem, imposible de desnormalizar.

```yaml
phrases:
  verdict:
    of: item        # la frase ve el ítem del grupo que la imprime
    on: item.floor
```

Y en español y francés esto **no es una comodidad, es corrección**: sin ver el ítem no hay
concordancia de género con lo interpolado. Dos de los 19 salían bien **por casualidad**, porque
todas sus piezas comparten género.

## 3. Interpolación

**152 interpolaciones en los 19, y ninguna necesita una operación dentro de las llaves.**

> **Las llaves llevan un nombre o un camino de un punto. Jamás una expresión.**

```markdown
Has estado aquí {visits-here} veces. La hoja dice {item.label}.
```

Lo que haya que calcular se declara en `names:`. La burocracia real son 38 líneas de declaración en
19 documentos, y merece pagarse: **el nombre es el ancla de la localización.** El español y el
francés comparten los nombres y no comparten ni una cláusula.

## 4. Grupos y bitácoras

El autor declara el grupo y **nombra sus campos**. El esquema solo aporta operadores.

```yaml
groups:
  claims:
    fields: [question, holds]
    keeps: duplicates      # o unique
    removes: none          # o last, any
    marks: [struck]
    items:
      - { id: s1, question: door, holds: false, text: La puerta estaba sellada a las tres. }
```

Un log es un grupo que crece: **una sola clave**, no dos. La disciplina se declara porque los
ejemplos difieren de verdad — el rastro append-only **marca** lo retirado y lo conserva; la cadena
de notas **saca** la última en cada regreso.

`keeps: unique` es lo que sostiene la decisión 26: sin él, «2 de 3 hojas» exige restar duplicados,
que es aritmética.

### Imprimir un grupo

La forma en línea sirve para una sola línea por ítem:

```markdown
:each{of=claims where holds}
La declaración dice: {item.text}
```

**Y la forma de isla para todo lo demás**, que en el corpus es 11 de 15 casos. La forma en línea
solo puede dar un párrafo y no tiene rama vacía, así que no alcanza a la mayoría de los bucles
reales — y `order:` y `empty:` existían en el contrato sin que nada pudiera escribirlos:

````markdown
```calamus
each: exits
order: unstable        # nombre del registro; el orden de las opciones es estructura
empty: |
  Ya no queda nada que tomar.
```

Sale por {item.label}, y no donde la viste la última vez.

Sigue pareciendo un camino.

```calamus
end
```
````

`empty:` es **prosa de cara al lector**, no un estado vacío: un grupo agotado suele ser el momento
en que la pieza dice algo.

La regla que las separa es la misma que gobierna los nodos: **una isla es una cabecera, y lo que
sigue le pertenece hasta su cierre.**

### Contradicción, escrita bien

```yaml
names:
  contradicts: { over: claims, by: question, test: split }
```

`by` y `test` son operadores; `question` es del autor. Agrupa **antes** de cuantificar, que es lo
que la v0 hacía mal.

## 5. Atributos de párrafo, y condiciones

Una sola directiva, la primera del párrafo, sin hijos:

```markdown
:with{when="visits(kiosk) > 1"}
Has estado aquí antes.

:with{lang=fr}
Un coup de dés jamais n'abolira le hasard.
```

Sustituye al `:if` de la v1, que **era agramatical en su propia gramática**: una directiva en línea
usada como modificador de bloque parsea como párrafo. Y metía la expresión en la ranura de hijos,
que es Markdown en línea, donde un `*`, un `_` o un `[` se destruyen. En un atributo sobreviven.

Lleva `when`, `id`, `voice`, `lang`, `mark`, `role` y `live`. `role` es un papel que **nombra el autor** — `heading`, `caption`, `time` —, no un número; y `live` lleva la cortesía que el autor pidió. **Lo decide `lang`**: dos de los tres
corpus de la demo son franceses y van en original.

## 6. Marcas e interior de frase

```markdown
El inventario lista :mark[una puerta]{kind=kept} en el rellano.
```

`kind` **lo nombra el autor** y lo declara; el esquema no tiene clases de marca propias. La v0 fijó
`kept` y `struck`, que son el vocabulario de un ejemplo concreto — el error de la decisión 1
cometido dentro del documento que advierte contra él.

## 7. Nodos y regiones

**Un nodo sustituye.** Lo que se revela en sitio es una *región*, que es otra cosa. 15 de los 19
tienen un solo nodo, y de los que tienen varios, todos sustituyen.

````markdown
```calamus
node: kiosk
requires: visits(platform) > 0
exits:
  - { to: platform, label: Volver al andén, when: not read }
```

Aquí el andén se ve pequeño.
````

La isla es **una cabecera: la prosa que sigue le pertenece** hasta la siguiente. Todos los formatos
que sobrevivieron delimitan así — Twine con `::`, Ink con `===`, Yarn con `title:`.

Siguen las **dos puertas**: `requires` en el nodo, `when` en la salida.

**`once:` no existe.** Desaparecer ya es el `when:` de la salida, y quedarse inerte ya es una marca.
La pregunta estaba mal planteada.

**Una región se abre como un nodo**, con su propia isla, y se revela en sitio en vez de sustituir:

````markdown
```calamus
region: nota-3
```

El texto que se despliega al tocarla.
````

**Dónde empieza:** `opens:`. El nodo de arranque **está** en el rastro, y un documento puede
declarar un rastro inicial no vacío — dos ejemplos abren a mitad de lectura a propósito.

## 8. Afordancias

De los 19, **solo dos navegan. El resto revelan en sitio.**

```markdown
El pasillo :go{show=note-3 focus=true} sigue hasta el fondo.
```

`:go{to=}` navega, `:go{show=}` revela, `:do{move=}` escribe. Sin etiqueta de cierre: la decisión 27
midió directivas en línea con hijos entre corchetes, no pares de apertura y cierre.

## 8bis. Los controles del lector

El hueco más grande que encontró la migración: **8 de 19 documentos terminan en un botón y 10
etiquetan un control**, y el formato no tenía sitio para ninguno de los dos. No es un caso borde —
es cómo el lector toca la obra.

Un control es una variable que el lector puede mover, y su etiqueta **es prosa que alguien lee**:

```yaml
variables:
  erosion:
    type: number
    min: 0
    max: 100
    default: 0
    control: range
    label: Cuánto se ha borrado
    unit: "%"
```

Y una afordancia puede ocupar un bloque, no solo vivir dentro de una frase:

```markdown
:do{move=forget label="Olvídame"}
```

`label` es prosa en los dos casos, así que pasa por la frase con casos cuando depende del estado —
que es como un botón dice «Abrir la siguiente hoja» y luego «No queda ninguna».

## 9. Ranuras

Nombre declarado y parámetros, nunca texto libre. El contrato completo — qué recibe, qué puede
escribir, los cinco espacios de nombres, la degradación por tipo y el problema del doble render —
está en **`contrato-ranuras.md`**.

## 10. Degradación

Todo falla hacia **legible**. La interpolación es siempre texto escapado y **nunca recursiva**, y
está prohibida en ranuras estructurales si el valor pudo escribirlo el lector — la decisión 25 hace
que el entregable sea un compilador de HTML, así que esto es seguridad, no formato.

| Situación | Comportamiento |
|---|---|
| `view` sin registrar | Renderiza su prosa. Error si la región no tiene ninguna |
| `order` sin registrar | **Error de compilación.** Degrada sin dejar residuo: la página se ve perfecta y la obra es otra |
| `mark` de tipo desconocido | Texto sin marca, nota accesible conservada |
| Isla desconocida | Se conserva y se re-serializa byte a byte |
| Expresión que no evalúa | El fragmento **se muestra** |

## 11. Lo que queda abierto

- **El recurso de una ranura frente a la paginación.** Paginar desmonta ranuras: atado al montaje,
  el tono se apaga al pasar de hoja; atado al documento, sigue sonando desde una hoja que el lector
  ya dejó. Las dos son defendibles y **producen obras distintas**.
- **Comillas simples para literales** dentro de expresiones en atributos.
