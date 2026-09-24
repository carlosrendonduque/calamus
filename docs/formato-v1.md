# Formato del documento narrativo — v1

> Sustituye a `formato-v0.md`, que quedó como registro de lo que se probó y falló.
>
> **La v0 logró 0 de 19.** No por faltarle funciones exóticas: **no tenía forma de meter un valor
> en una frase, ni de escribir dos versiones de una misma frase.** Sin eso, contar visitas solo
> sirve para ocultar párrafos, y los 19 ejemplos se caen. Lo único que la v0 sabía expresar era su
> propio caso degenerado: prosa plana.
>
> Esta v1 incorpora lo que la suite de conformidad ganó. **Necesita una segunda pasada** antes de
> que exista un intérprete.

## 0. Lo que la v0 tenía mal, no incompleto

Dos errores, ambos confirmados contra el código:

**La expresión de §2.5 no expresaba el ejemplo que la justificaba.** `some(claims where holds) and
some(claims where not holds)` da verdadero en cuanto el lector sostiene dos afirmaciones de signo
opuesto **aunque respondan a preguntas distintas**. El código real agrupa por `claim` primero y
cuantifica dentro de cada grupo. La v0 declaraba contradicciones que no existen.

**La v0 filtraba la ontología de una obra.** Fijaba `kept` y `struck` como las clases de marca del
esquema. Esas dos palabras son de `Motifs.tsx` — «kept by the second clerk». Es exactamente el
error que castigó la decisión 1, cometido dentro del documento que advierte contra él.

De ahí sale la regla, más afilada que antes:

> **Todo nombre que el autor escribe le pertenece. El esquema solo aporta operadores.**

## 1. Forma general

Sin cambios respecto a la v0, y es lo único que sobrevivió intacto:

```markdown
---
title: El pasillo
calamus: 1
---

Hay un pasillo que no conduce a ninguna puerta.
```

Documento válido y completo. Es el `ReaderContent` de hoy, y la decisión 22 hecha carne.

## 2. La frase con casos — el centro del formato

**17 de 19 la necesitan.** Es a la vez la frase que le cuenta al lector lo que ha hecho y la
primitiva de *variante* que la v0 había perdido. Una sola forma para las dos cosas.

Y es **lo primero que hay que cerrar**, por un motivo que no es su tamaño: es el único hueco cuyo
arreglo tardío **rompería archivos de prosa ya escritos**. Todo lo demás es aditivo.

```yaml
frases:
  en-pie:
    on: lineas
    cases:
      - { is: 0,  say: No queda ninguna línea en pie }
      - { is: 1,  say: Queda una línea en pie }
      - {         say: Quedan {lineas} líneas en pie }
```

Casos ordenados, gana el primero que encaja. `is: n` es azúcar de `when: x == n`, así que hay un
solo mecanismo. Y cada caso es **una cláusula entera**, no una raíz con sufijo.

### Por qué una cláusula entera, y no `línea{s}`

El español lo decide, y no es pedantería:

- **«Queda» / «Quedan»** — el número lo lleva el **verbo**, y el verbo va **antes** del sustantivo.
  Ningún sufijo alcanza hacia atrás.
- **«ninguna» / «una»** — género.
- **«vez» / «veces»** — cambia la raíz, no solo la cola.
- **«tachadas»** concuerda en femenino plural **a diez palabras** del número que lo decide.

Coste, dicho claro: **no hay azúcar de una línea, y en español no puede haberla.**

Límite, dicho claro: los casos por entero cubren es/en/fr/de/it/pt, pero **no las bandas de plural
del polaco o el ruso**, cuya regla real es `n mod 10` — y el módulo es aritmética, que la decisión
26 prohíbe. Salida limpia: el selector de plural es **un nombre del registro** (`plural: pl`), por
defecto `exact`, así que CLDR nunca entra en el paquete.

**Unir listas** se declara, nunca lo elige la librería: `sep:` y `last:` literales. El español lo
prueba — «y» se vuelve «e» delante de i-.

## 3. Interpolación

**17 de 19.** Con la regla que impide que esto degenere en lenguaje de plantillas:

> **Las llaves llevan un nombre, jamás una expresión.**

```markdown
Has estado aquí {visitas-aqui} veces.
```

Lo que haga falta calcular se declara antes, con nombre, en `names:`. Así la prosa nunca contiene
lógica y el parser no necesita evaluar dentro de una frase.

## 4. La sexta primitiva: grupos y bitácoras

**14 de 19.** La v0 la mostraba una vez y la llamaba «la única concesión». No es una concesión: es
la forma de la que están hechos la mayoría de los ejemplos.

El autor declara el grupo y **nombra sus campos**; el esquema solo aporta operadores.

```yaml
groups:
  afirmaciones:
    fields: [pregunta, sostiene]
    items:
      - { id: s1, pregunta: puerta,  sostiene: false, text: La puerta estaba sellada a las tres. }
      - { id: s2, pregunta: puerta,  sostiene: true,  text: A las tres y dos seguía abierta. }
```

Operadores del esquema: `count(g where …)`, `some`, `first`, `last`, `in`.

Y la contradicción, escrita **bien** esta vez — agrupando antes de cuantificar:

```yaml
names:
  contradice:
    over: afirmaciones
    by: pregunta          # agrupa por el campo que nombra el autor
    test: split           # el grupo contiene las dos respuestas
```

`by` y `test` son operadores; `pregunta` es del autor. Sin nombres de campo en el esquema.

**El rastro de nodos es simplemente la bitácora que el esquema lleva gratis.** Ocho necesidades
distintas de «lista» colapsan en una. Y preserva la decisión 26: **incrementar es añadir a una
bitácora, no sumar.**

Cada bitácora declara si admite borrado, porque los ejemplos difieren: el rastro append-only
**marca** la línea retirada y la conserva; la cadena de notas **saca** la última en cada regreso.

## 5. Afordancias en línea

**8 de 19**, y el dato que lo decide: de los 19, **solo dos navegan de verdad. El resto revelan en
sitio.** La v0 solo daba afordancias al grafo, y un formato de hipertexto cuyos enlaces viven
únicamente en un bloque YAML no puede escribir *afternoon*.

```markdown
El pasillo :go{show=nota-3 focus=true}sigue{/go} hasta el fondo.

Toca :set{leida=true}aquí{/set} y la página lo recordará.
```

`:go{to=}` navega. `:go{show=}` revela en sitio. `:set` y `:log` escriben.

## 6. Los nodos, y quién posee la prosa

La isla es **una cabecera: la prosa que sigue le pertenece**, hasta la siguiente cabecera.

Resuelve la ambigüedad más peligrosa de la v0, y con precedente: **todos los formatos que
sobrevivieron delimitan con una línea de cabecera, nunca por anidamiento.** Twine con `::`, Ink con
`===`, Yarn con `title:` / `---` / `===`.

````markdown
```calamus
node: kiosko
requires: visits(anden) > 0
exits:
  - { to: anden, label: Volver al andén, once: true }
```

Aquí el andén se ve pequeño. Has estado {visitas-aqui}.
````

Siguen las **dos puertas** de la decisión 26: `requires` en el nodo, `when` en la salida.

## 7. Degradación

Sin cambios respecto a la v0 — es lo otro que sobrevivió. Todo falla hacia **legible**, y la fila
que más importa sigue siendo que un `kind` de marca desconocido **renderiza el texto sin marca**.

## 8. Lo que sigue abierto

Quince ambigüedades están catalogadas en `conformance/README.md`. Las que bloquean:

- **`:if` es agramatical en su propia gramática.** Solo en una línea, es una directiva en línea, así
  que parsea como párrafo y no como modificador del siguiente. Y mete una expresión en la ranura de
  hijos, que es Markdown en línea: un `*`, un `_` o un `[` dentro de la expresión se destruyen.
- **Un párrafo no tiene dónde llevar atributos.** `weight`, `id`, `voice`, `lang` no tienen sitio.
- **Qué es un nodo al renderizar**: ¿una página que sustituye, o una región revelada en sitio?
  `visited()` significa cosas distintas en cada lectura.
- **Dónde empieza la lectura, y con qué rastro.** Dos ejemplos abren a mitad de lectura **a
  propósito**, así que un documento debe poder declarar un rastro inicial no vacío.
- **`once: true`**: ¿la salida desaparece, o se queda visible e inerte con su marca? Las dos son
  defendibles y **producen obras distintas**.
- **Interpolar texto escrito por el lector**, sin regla de escapado — y la decisión 25 hace que el
  entregable sea un compilador de HTML, así que esto es una decisión de seguridad.
- **`calamus: 1` no tiene semántica.** Lexical deprecó su propio campo `version` exactamente por
  esto, y la v0 copió de Lexical todo menos eso.
- **No hay sintaxis de comentario.** Se descubrió escribiendo los 19: no pueden llevar la nota de
  por qué están escritos así.

## 9. Veredicto sobre la partición

El número era correcto, la pertenencia no, en las dos direcciones.

**`unstable-links` no necesita una ranura de expresión**: necesita un nombre, `order: unstable`,
sobre la región que imprime las salidas restantes. Pero como el orden de las opciones **es
estructura** (decisión 23) no puede ir detrás de un componente, y como sirve a un solo ejemplo la
decisión 21 dice que sí. Es el único choque estructural que encontró la suite, y se reconcilia
dejando que `order:` tome un nombre que resuelve el registro.

**`route-snapshots` no es un documento**, y la partición fue blanda con él. Necesita rastros
guardados **como valores**, elegir dos, comparar dos listas **por posición**, un índice de primera
divergencia, y una ranura que **escriba de vuelta**. Es el ejemplo con el que hay que diseñar el
contrato de escritura de las ranuras, no el que hay que estirar el esquema para alcanzar.
