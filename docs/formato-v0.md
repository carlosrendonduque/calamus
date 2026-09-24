# Formato del documento narrativo — borrador v0

> **Esto es un borrador para ser refutado, no una especificación.** El método está fijado por la
> decisión 21: reescribir cada ejemplo de nivel A como documento **antes** de escribir el
> intérprete. Si un ejemplo pide una función nueva, la función está ganada. Si pide una palabra
> clave que sirve a un solo ejemplo, ese ejemplo va detrás de una ranura.
>
> Se espera que este borrador cambie al chocar con los 17. Si no cambia, es que no se probó bien.
>
> La regla que gobierna todo lo de abajo, de la decisión 22: **el lado de la prosa no se puede
> romper dos veces.** Por eso se escribe antes de que exista un solo archivo escrito en él.

## 1. Forma general

Un documento es **Markdown con front matter**. Nada más, mientras no necesite más.

```markdown
---
title: El pasillo
calamus: 1
---

Hay un pasillo que no conduce a ninguna puerta. Por la tarde parece normal.

Desde entonces camino más despacio.
```

Eso ya es un documento válido y completo. Renderizado en `scroll`, `book`, `terminal` o
`editorial` es **exactamente el `ReaderContent` de hoy**: cada párrafo es un fragmento. Esa es la
decisión 22 hecha carne — el texto plano no es un contrato aparte, es este documento sin ninguna
directiva dentro.

`calamus: 1` es la versión del formato. Es lo único obligatorio además del título.

## 2. Las cinco primitivas

Extraídas de los 32 ejemplos, no inventadas. Cada una aparece aquí con la sintaxis propuesta.

### 2.1 Variable

Declarada en el front matter. Tipo inferido del valor por defecto.

```yaml
---
title: Erosión
calamus: 1
variables:
  erosion: { type: number, min: 0, max: 100, default: 0, control: range }
  leida: { type: boolean, default: false }
  puerta: { type: enum, of: [norte, sur], default: norte }
---
```

`control` es opcional y solo dice **si el lector puede moverla**, y con qué. Sin `control`, la
variable solo la mueve el documento.

Toda variable se emite además como custom property de CSS (`--erosion`), porque cinco de los diez
casos de superficie hacen aritmética sobre ella y **esa aritmética tiene que caer en CSS**, no en
JavaScript.

**Peso por ítem**, que cinco ejemplos necesitan: un fragmento puede llevar `weight`, y el valor
que recibe CSS es `variable × weight`. Así un solo número produce N valores a lo largo de una
frase sin que el documento enumere los N.

### 2.2 Rastro

No se declara: existe siempre. Es el historial ordenado de nodos visitados, **con duplicados**.

Un `Set` de visitados falla tres ejemplos de plano, así que el rastro cuenta:

- `visits(kiosko)` — cuántas veces se estuvo ahí.
- `trail` — la secuencia, en orden, con repeticiones.
- `last` — el último.

### 2.3 Fragmento

Cualquier párrafo es un fragmento. Se le añaden atributos cuando hacen falta:

```markdown
Esta frase siempre se lee.

:if[visits(kiosko) > 1]
Has estado aquí antes.
```

Y **por debajo de la frase**, que es lo que `body: string[]` nunca pudo sostener:

```markdown
El inventario lista :mark[una puerta]{kind=kept} en el rellano, y el
escribiente firmó que el rellano estaba :mark[vacío]{kind=struck}.
```

La marca lleva **semántica, no una clase**: `kept` se renderiza como `<mark>` con subrayado,
`struck` como `<s>`. Quien no entienda el `kind` renderiza el texto tal cual — nunca lo pierde.

**Distancia**, que Mallarmé necesita y que es gramática y no estilo:

```markdown
:blank[3]

JAMAIS
```

### 2.4 Nodo y salidas

Una isla cercada, porque lleva datos estructurados:

````markdown
```calamus
node: kiosko
requires: visits(anden) > 0
exits:
  - to: anden
    label: Volver al andén
    once: true
  - to: tunel
    label: Bajar al túnel
    when: not leida
```
````

**Dos puertas, no una**, según la decisión 26. `requires` en el nodo responde «¿se me permite
entrar aquí?». `when` en la salida responde «¿puedo salir por ahí?». Son preguntas distintas y
Storyspace las mantuvo separadas por una razón.

`once: true` es la salida que se cierra al usarse.

### 2.5 Expresión

Deliberadamente pequeña, por la decisión 26. **Comparaciones contra variables y conteos de
visita. Sin aritmética.**

| Forma | Ejemplo |
|---|---|
| Comparación | `erosion > 40`, `puerta == norte` |
| Visita | `visits(kiosko) > 1`, `visited(tunel)`, `unvisited(tunel)` |
| Booleana | `leida`, `not leida` |
| Combinación | `a and b`, `a or b` |
| Cuantificada sobre grupo | `some(claims where holds) and some(claims where not holds)` |

La última es la única concesión, y se la ganó el detector de contradicciones: su propio comentario
insiste en que el choque **no puede estar cableado a un par concreto**. Sin cuantificación sobre un
grupo que nombra el autor, ese ejemplo solo se puede escribir a mano.

## 3. La ranura

Lo que el esquema nunca podrá decir. Nombre declarado y parámetros — **nunca texto libre**, que es
la lección cara de Yarn Spinner.

````markdown
```calamus
slot: rain
lines: from(body)
step: 30
```
````

Y en línea, para variar una frase:

```markdown
La lluvia :slot[cae]{name=erode intensity=0.7} sobre el andén.
```

El documento **no lleva el componente**: lleva su nombre. Quien renderiza aporta el registro:

```tsx
<Reader document={doc} registry={{ rain: RainColumn, erode: Erode }} />
```

Los 32 ejemplos de la galería **son entradas de ese registro**, no documentos. Esa distinción es
la que impide creer que el documento tiene que llevar código dentro.

**El registro es un argumento, jamás una constante.** Storyplayer tiene un esquema impecable y un
mapa de renderizadores fijo en el código, así que añadir un tipo exige bifurcar la librería.

## 4. Degradación — se diseña antes que el éxito

De la decisión 28. Todo falla hacia **legible**.

| Situación | Comportamiento |
|---|---|
| `:slot` desconocido | Renderiza sus hijos como prosa. **Nunca se pierde texto.** |
| Isla `calamus` desconocida | Se omite visualmente, se conserva y se re-serializa. |
| Clave desconocida en algo conocido | Se retiene intacta y se re-emite al guardar. |
| Expresión que no evalúa | El fragmento **se muestra**, no se oculta. |
| `kind` de marca desconocido | El texto se renderiza sin marca. |

La última fila es la que más importa y la que casi nadie implementa: un lector con una versión
vieja del renderizador **sigue leyendo la prosa entera**.

## 5. Lo que este borrador todavía no resuelve

Honestamente, y son los sitios por donde va a romperse al probarlo:

- **Dónde empieza la lectura.** Un documento con nodos necesita un punto de entrada. ¿El primer
  nodo, o uno declarado?
- **Si la prosa entre islas pertenece a un nodo** o flota. Ahora mismo está ambiguo, y es la
  ambigüedad más peligrosa del borrador.
- **Qué escribe de vuelta una ranura.** Puede alterar variables, y no está dicho cómo.
- **La frase que le cuenta al lector lo que ha hecho** — 26 de los 32 terminan así. `visits()` la
  alimenta, pero la pluralización y el unir listas no tienen sintaxis aquí, y son exactamente lo
  que 22 de 32 hacen a mano hoy. **Es el hueco más grande de este borrador.**
- **Persistencia.** `localStorage` entre visitas es una capacidad real de un ejemplo, y no está.
