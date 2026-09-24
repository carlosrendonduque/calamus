# El contrato de las ranuras — v1

> Documento de trabajo interno, en español como `decisiones.md`. Diseña la costura que
> `arquitectura-v2.md` §3 nombra y no especifica: **el registro que llena el anfitrión y el
> documento refiere por nombre.** `formato-v1.md` §5 enseña una ranura usándose y no dice qué
> recibe, qué puede hacer, ni qué pasa cuando no está.
>
> **Nada de esto está implementado y no se ha tocado `src/`.** Se diseña contra la evidencia de
> los 32 ejemplos de `playground/gallery/` y los 19 documentos de `docs/conformance/`.
>
> Vinculan: decisión 21 (lo que sirve a un ejemplo va detrás de ranura), 23 (la navegación vive
> en el documento), 25 (el entregable es un compilador), 26 (cero aritmética), 27 (dos
> granularidades), 28 (fallar hacia legible), 29 (el lector mide su caja), 30 (todo nombre
> autoriado pertenece al autor), 14 (las dos decisiones de accesibilidad contraintuitivas).

## 0. El contrato en diez líneas

1. Una ranura recibe **un solo argumento congelado** y, dentro de él, **solo lo que su isla
   declaró**. No recibe el documento, ni el grafo, ni el paginador, ni la navegación.
2. Una ranura **no escribe variables**. Invoca **movimientos declarados por el autor**, listados
   en su propia isla (`writes:`). Tiene exactamente la autoridad de una afordancia que el autor
   podría haber escrito en prosa, y ni un bit más.
3. El registro son **cinco espacios de nombres**, no uno: `views`, `marks`, `orders`,
   `derivations`, `plurals`. Y un mecanismo aparte, `needs:`, que no es un espacio de nombres.
4. La degradación es **distinta por clase**, porque una `view` que falta deja residuo de prosa y
   una `order` que falta **no deja residuo ninguno**: esa asimetría decide los valores por
   defecto del compilador.
5. La librería **no delega** el nombre accesible, las regiones vivas, el equivalente textual, el
   orden de foco ni la política de movimiento reducido. Una ranura no puede distinguir intención
   de layout, y la decisión 14 se apoya entera en esa distinción.
6. Los estilos entran **solo** por los tokens `--calamus-*` y por las custom properties de las
   variables. El contrato es la herencia dentro de `.calamus-root`, y la aritmética vive en CSS.
7. Los recursos (`AudioContext`, observadores, temporizadores) se adquieren **solo dentro de un
   gesto** y **solo a través de la librería**, que los cierra.
8. Como la medición pasa a renderizar nodos React (`arquitectura-v2.md` §8), **una ranura se
   renderiza dos veces**. En la pasada de medición las capacidades de escritura y de recurso
   **no existen** — no están prohibidas, están ausentes.
9. Todo se resuelve **en tiempo de compilación**: nombres estáticos, cero `import()` dinámico,
   cero `eval`. El documento **declara sus dependencias** (`uses:`), que es lo que Yarn Spinner
   no pudo hacer.
10. Una entrada del registro **no conoce los nombres de campo del autor**: declara *roles* y el
    documento los enlaza. Es la decisión 30 aplicada dentro del registro.

## 1. ¿Qué recibe una ranura?

### 1.1 Un solo argumento, congelado, con forma de tripleta estructurada

La lección de Yarn Spinner (`arquitectura-v2.md` §7quinquies) es que la salida de emergencia hay
que **estructurarla** desde el primer día: su marcado de spans resolvió a
`(nombre, posición, longitud, propiedades)` y por eso creció años sin un cambio rompedor,
mientras sus comandos, que eran una cadena opaca, se quedaron en techo permanente.

Así que una ranura no recibe props sueltos. Recibe **un objeto, `ctx`**, congelado, y sus datos
van en compartimentos con nombre. Añadir un compartimento nunca rompe una entrada existente.

```ts
type Pass = "measure" | "live";
type Valor = number | boolean | string | readonly string[];

type SlotContext = Readonly<{
  // identidad
  name: string;            // el nombre autoriado que resolvió esta entrada
  instance: string;        // identidad estable de *esta* aparición en el documento
  pass: Pass;              // "measure" mientras el paginador mide
  revision: number;        // revisión del estado del documento contra la que se renderiza

  // datos, todos proyectados: solo lo que la isla declaró
  params: Readonly<Record<string, Valor | Data>>;  // la isla es YAML: datos ricos, ya tipados
  bind:   Readonly<Record<string, string>>;        // rol declarado -> campo del autor
  vars:   Readonly<Record<string, Valor>>;         // solo las de `vars:`
  items:  readonly Readonly<Record<string, Valor>>[];  // la proyección de `of:`
  children: ReactNode;                             // la prosa de la región, ya renderizada

  // entorno
  lang: string;
  motion: "full" | "reduce";
  box: Readonly<{ inline: number; block: number }> | null;  // solo con `needs: [box]`

  // capacidades (ausentes en pass === "measure")
  affordance(move: string, payload?: Data): AffordanceProps;
  commit(move: string, payload?: Data): boolean;
  announce(phrase: string): void;
  hold<T>(key: string, acquire: (g: Gesture) => T, release: (v: T) => void): T | null;
}>;
```

### 1.2 Proyección, no acceso

`vars`, `items` y los registros a los que la ranura llega **no son el estado del documento**: son
una **proyección declarada en la isla**. Lo que no se nombra no se pasa.

````markdown
```calamus
slot: route-compare
of: picked              # el grupo o log que la ranura puede leer
vars: [walks]           # las variables que puede leer
bind: { label: name, series: route }   # roles de la entrada <- campos del autor
writes: [pick]          # los movimientos que puede invocar
reserve: { aspect: 3/2 }
```
La prosa que sigue pertenece a la región, y es también su reserva de degradación.
````

Tres razones, y ninguna es higiene:

1. **Auditable estáticamente.** El compilador ve, sin ejecutar nada, qué puede leer y qué puede
   escribir cada aparición de cada ranura. Eso es lo que permite la tabla de manifiesto de §9, y
   es el precedente de articy (§7ter): *el esquema viaja dentro del documento*.
2. **Agnosticismo de contenido.** Con `bind:`, la entrada del registro declara roles
   (`label`, `series`) y **nunca conoce `name` ni `route`**. Sin esto, la primera ranura útil
   codifica el vocabulario de una obra dentro de la librería del anfitrión y se repite el error de
   la decisión 1 un nivel más abajo — que es exactamente lo que la decisión 30 pilló dentro del
   formato con `kept`/`struck`. El campo `naming: [name, route]` que aparece en
   `conformance/route-snapshots.md` es este mecanismo, escrito antes de tener nombre.
3. **Estabilidad de la medición.** Una ranura que puede leer cualquier cosa puede cambiar de
   tamaño por cualquier cosa, y entonces la pasada de medición y la real no coinciden. Con
   proyección, el conjunto de entradas que pueden mover la caja es finito y está escrito.

### 1.3 Lo que **no** se pasa, con su motivo

| No se pasa | Motivo |
|---|---|
| El documento completo, la prosa de otros nodos | Una ranura que puede leer el final es una ranura que puede filtrarlo, y vuelve inauditable la proyección |
| El grafo de nodos y cualquier función de navegación | Decisión 23: la navegación es estructura y vive en el documento. Una `view` que navega es un `hypertext` disfrazado |
| El paginador: cuenta de páginas, hoja actual, `scrollWidth` | Circular por construcción. La paginación **es** el resultado de medir la ranura; si la ranura se dispusiera según su página, la medición dependería de su propio resultado. Es el bucle de la decisión 19 reintroducido desde dentro |
| Nodos DOM del lector, refs a la superficie, React mismo | La librería no expone su árbol; una ranura que toca `.calamus__*` se rompe en el siguiente refactor (ver §7.3) |
| Los valores de tema como cadenas de JS | Los tokens los resuelve CSS. La decisión 29 ya fijó el patrón inverso: cuando un número gobierna el layout *y* hace falta en JS, **se lee de vuelta de la misma custom property que gobierna el layout**, para que las dos no puedan discrepar |
| Almacenamiento persistente | La persistencia es `persist:` sobre una variable (P11), no una capacidad de la ranura. Si la ranura persistiera, el estado dejaría de ser serializable de una pieza — el motivo exacto por el que el autor de Chapbook sacó las extensiones del estado |
| Un canal de anuncios libre | `announce()` **solo acepta el nombre de una `phrases:`** del documento, nunca una cadena. Ver §5.2 |

`window` y `document` no se retiran: no se puede, y pretenderlo sería teatro. Una entrada del
registro es **código del anfitrión, compilado dentro de la página**; el contrato previene errores,
no malicia. Lo que sí es exigible y comprobable (§12) es que no instale escuchas en `document` ni
en `window`: el README promete hoy que *la librería no instala ninguna*, y una ranura que lo haga
rompe una promesa publicada.

### 1.4 Estado privado: permitido, efímero, nunca del documento

`MediaEvidenceBoard.tsx` mueve un reloj diez veces por segundo. Si eso fuera estado del
documento, el documento cambiaría diez veces por segundo: historial inútil, serialización
absurda, repaginación continua. Así que:

> Una ranura **puede** tener estado local. Ese estado **no es estado del documento**, no se
> serializa, no entra en el rastro, y **su pérdida tiene que ser inocua**, porque una
> repaginación o un giro de hoja puede desmontarla.

La regla operativa: todo lo que el lector deba poder recuperar, nombrar o llevarse va al
documento; lo sub-segundo y puramente presentacional se queda dentro. El caso incómodo —el audio
que se corta al girar la hoja— está en §13 sin resolver.

## 2. ¿Qué puede hacer una ranura al estado del documento?

### 2.1 Nada directamente: invoca movimientos declarados

Ninguna ranura recibe un `setState`, ni un `dispatch` de funciones, ni las variables como
escribibles. Escribe **invocando un movimiento**, que es la primitiva que la suite ya ganó:
la ambigüedad A10 (un salto de `recover-anchor` mueve el foco, escribe una variable y añade a un
log de una vez) obligó a declarar los efectos fuera de la prosa, en `moves:`.

```yaml
moves:
  keep:
    add: { kept: { name: "Route {count(kept)}", route: trail } }
    resets: trail
  pick:
    toggle: { picked: "{of}" }     # `of` es el único parámetro que el movimiento acepta
    max: 2
    overflow: drop-oldest
```

Y en la isla de la ranura, `writes: [pick]`.

De ahí salen cinco propiedades, y las cinco son el contrato:

1. **El autor ve en su documento qué puede cambiar la ranura.** Una sola línea, en el sitio donde
   está usada. Si la lista está vacía, la ranura es de solo lectura y eso es comprobable.
2. **Una ranura no tiene más autoridad que un enlace.** `commit("pick", …)` y
   `:do[…]{move=pick}` pasan por el mismo reductor. No hay una segunda puerta al estado, que es
   la forma habitual de que el estado se corrompa: dos caminos con invariantes distintas.
3. **Los efectos son los operadores del documento**, no mutaciones: añadir a un log, poner una
   variable a un valor de su dominio declarado, reiniciar un log. El estado sigue siendo
   serializable a JSON en todo momento (el motivo de Chapbook), y la decisión 26 aguanta:
   incrementar es añadir, no sumar.
4. **La carga se valida contra la declaración del movimiento.** Un `payload` con una clave que el
   movimiento no declara, o un valor fuera del dominio de la variable, se **rechaza entero** —
   nunca se aplica a medias. `commit` devuelve `false` y en desarrollo es un error con el nombre
   de la ranura y la línea de la isla.
5. **Un movimiento que no está en `writes:` no existe para esa ranura.** No es un fallo de
   permiso en tiempo de ejecución que se pueda ignorar: el compilador lo rechaza (§9).

### 2.2 Cuándo se puede escribir: solo dentro de un gesto real

`commit` devuelve `false` y no hace nada si:

- `pass === "measure"` — la pasada de medición;
- no hay activación de usuario en curso (no viene de un manejador de evento);
- `revision` ya no es la actual (una escritura rancia de un manejador replicado);
- el mismo gesto ya consumió su token de escritura para ese movimiento.

Las tres primeras son las que hacen inofensivo el doble render (§8). La cuarta es la que hace
idempotente un doble clic o un manejador que React vuelve a invocar.

**No hay escritura en montaje.** No como regla de estilo: en la pasada de medición `commit` es
inerte, así que una ranura que escribiera al montar simplemente no escribiría la mitad de las
veces, y el autor lo vería. En desarrollo es un error explícito.

### 2.3 Afordancias: la geometría es de la ranura, el botón es de la librería

El caso que obliga a diseñar esto es `StateInvestigatorBoard.tsx`: los alfileres se pulsan
**dentro del dibujo**, en coordenadas que solo la ranura conoce. Una afordancia en prosa no
alcanza ahí.

La salida no es dejar que la ranura escriba botones:

```tsx
// La librería da los props; la ranura decide dónde caen.
<button {...ctx.affordance("pin", { of: item.id })} style={{ "--x": item.x, "--y": item.y }} />
```

`affordance()` devuelve `type`, `onClick`, `aria-pressed`/`aria-current` cuando el movimiento es
un `toggle`, `aria-label` **construido con una `phrases:` del documento**, `disabled` cuando la
guarda del movimiento es falsa, y `data-*` de diagnóstico. La ranura **debe** volcarlos sobre un
elemento interactivo nativo; en desarrollo se comprueba que lo hizo (§12).

Reparto, dicho como regla: **la ranura posee la geometría; la librería posee el nombre, el
estado, la guarda y el anuncio.** Es el mismo reparto que la decisión 14 ya eligió para las
barras de progreso —dibujo decorativo más equivalente textual de la librería— aplicado a una
superficie que el autor compone.

### 2.4 Qué impide que una ranura corrompa el estado

Cuatro cercos independientes, y ninguno depende de la buena voluntad de la entrada del registro:

| Cerco | Qué corta |
|---|---|
| **Proyección** (`vars:`, `of:`) | No puede leer lo que no se le declaró, así que no puede depender de ello ni filtrarlo |
| **Movimientos** (`writes:`) | No puede escribir una variable que el autor no puso detrás de un movimiento, ni con una forma que el movimiento no declara |
| **Pasada y gesto** | No puede escribir mientras se mide, ni fuera de una activación de usuario, ni contra una revisión vieja |
| **Compilación** | Un `writes:` que nombra un movimiento inexistente, o una entrada que declara roles que el `bind:` no cubre, no llega a compilar |

## 3. ¿Una ranura es siempre un componente? No: el registro son cinco espacios de nombres

### 3.1 El argumento

De los 14 ejemplos que necesitan una ranura, **dos no son componentes**: `unstable-links` es una
función de ordenación y `route-snapshots` es una comparación. Y la suite ya había encontrado por
qué no pueden ser componentes: `conformance/README.md` §5 registra que el orden de las salidas
**es estructura** (decisión 23) y por tanto *no puede irse detrás de un componente*, mientras la
decisión 21 dice que una función que sirve a un solo ejemplo sí tiene que salir del esquema. El
único choque estructural que encontró la suite se reconcilia dejando que `order:` tome un nombre
que resuelve el registro — es decir: **una ranura escrita como atributo, no como componente.**

Colapsar en un espacio de nombres falla en las dos direcciones:

- **Todo componente**: `order: unstable` tendría que ser un componente que envuelve las salidas,
  que es precisamente meter la estructura detrás de presentación. Y una `derivation` tendría que
  renderizar su propio resultado, lo que devuelve la prosa al código — el error que la decisión
  30 acaba de castigar.
- **Todo función pura**: se pierde el ciclo de vida que las dos ranuras de audio necesitan, y la
  reserva de caja de §8 no tendría a qué agarrarse.

La lección de Storyplayer no exige un espacio de nombres: exige que **el mapa sea un argumento y
no una constante**. Cinco mapas pasados como argumento cumplen la lección igual que uno, y su
vicio —`add` no existe porque el mapa es un objeto literal en el código— se evita en los cinco.

### 3.2 Los cinco, con su firma y su posición en el documento

| Espacio | Desde dónde se nombra | Firma | Pura | Los sirve |
|---|---|---|---|---|
| `views` | `slot:` (isla), `:slot[…]{name=}` (en línea) | componente React de `ctx` | no (ciclo de vida) | 9 de render, 2 de audio, `narrow-measure`, `cover`, columnas |
| `marks` | `marks: { x: { as: … } }` (P7) | componente de `{ children, note, ctx }` | sí | `cover` de `redaction` |
| `orders` | `order:` en una región | `(items, seed, ctx) => items` | **sí, y permutación** | `unstable-links` |
| `derivations` | `names:` / `test:` | `(proyección) => Valor \| Grupo` | **sí** | `route-snapshots` |
| `plurals` | `plural:` en el front matter | `(n, lang) => índice de caso` | sí | ya especificado en `formato-v1.md` §2 |

Dos notas que importan:

**`derivations` devuelve valores del formato, no nodos.** Su retorno tiene que ser expresable en
las primitivas del documento: un número, un booleano, una cadena, una lista, o **un grupo con los
campos que declara**. Eso es lo que mantiene la prosa dentro del documento: el resultado se
imprime con `each:` y se elige con `phrases:`, no con una plantilla dentro de una función. Es el
cambio que convierte `route-snapshots` de «no es un documento» en documento (§10).

**`orders` recibe una semilla del estado, no aleatoriedad.** `order` tiene que ser pura y
determinista para una `(items, seed)` dada, porque si no, la pasada de medición y la real
producen dos listas y la paginación baila. La semilla la da el documento (por ejemplo la longitud
de un log). No es una limitación: el `PathUnstable.tsx` real ya lo hace así —su pivote es
`1 + ((step*5) % (n-1))`, una función del paso— y lo autoriado, como registró la suite, es «el
orden es inestable», no ese módulo.

### 3.3 `needs:` no es un espacio de nombres

`narrow-measure` (`TypeMeasure.tsx`) parece pedir un sexto espacio, «capacidades de entorno»,
porque monta su propio `ResizeObserver`. **No se le da.** Se le da una *necesidad declarada*:

````markdown
```calamus
slot: narrow-measure
needs: [box]
```
````

y la librería entrega `ctx.box`. Motivos, en orden de peso:

1. **La decisión 29 ya dijo de quién es la medición.** El lector mide su caja y lee la cuenta de
   columnas de vuelta de la misma custom property que gobierna el grid, *para que el paginador no
   pueda discrepar del grid*. N ranuras con N observadores es exactamente esa discrepancia,
   multiplicada.
2. **Un observador dentro de una superficie paginada realimenta la superficie.** Es el bucle de
   la decisión 19 con una frontera más, y se presenta como parpadeo, no como bug reconocible —el
   modo de fallo que `arquitectura-v2.md` §9bis ya predijo para los iframes.
3. Un solo observador, una sola política de *debounce*, un solo sitio donde arreglarlo.

Necesidades previstas: `box` (tamaño de la caja de la región), `motion` (ya en `ctx`), `gesture`
(la ranura adquiere recursos, §7), `frame` (un tic de animación que la librería para bajo
movimiento reducido y cuando la región no está visible). Todas se sirven, ninguna se registra.

## 4. ¿Qué pasa cuando un nombre no está registrado?

La decisión 28 fija la dirección —fallar hacia legible, nunca perder prosa— y Portable Text el
modelo. Pero **la degradación no puede ser la misma para las cinco clases**, y el motivo es una
asimetría que conviene decir entera:

> Una `view` que falta **deja residuo**: la prosa de su región sigue ahí y el lector nota que
> falta un dibujo. Una `order` que falta **no deja residuo ninguno**: la página se ve perfecta y
> la obra es otra. Una degradación invisible es peor que una visible.

Es la razón por la que el `EXTERNAL` de ink tiene funciones de *fallback* declaradas: una función
que falta no tiene texto que sobreviva.

| Clase | Falta en ejecución | Falta en compilación (defecto) |
|---|---|---|
| `views` | La región renderiza **sus hijos como prosa**. La isla es una cabecera y la prosa que sigue le pertenece (P5): esa prosa **es** la reserva de degradación | **Advertencia** si la región tiene prosa; **error** si está vacía, porque entonces no hay nada que leer |
| `marks` (`as:`) | El texto se renderiza **sin marca**, conservando la `note:` accesible del autor. Ya está en `formato-v1.md` §7 y es la fila que más importa | Advertencia |
| `orders` | Cae a **orden del documento** — el orden en que el autor escribió los ítems. Es la única caída siempre definida, y es una permutación legal, así que la invariante se mantiene | **Error.** Una obra cuyo tema es el desorden, servida en orden, se lee sin síntoma |
| `derivations` | El nombre **no evalúa**: se imprime `{nombre}` literal (P1) y la `phrases:` que selecciona sobre él cae a su caso final. La frase sale legible y mal, que es la dirección correcta de la decisión 28 y no la contraria | **Error** |
| `plurals` | Cae a `exact`, que ya es el defecto y es correcto en en/es/fr/de/it/pt | Advertencia |
| `needs:` no disponible en el entorno | La librería sirve un valor degradado (`box` de la container query, `frame` inerte). **Nunca es un fallo**: es entorno, no registro | — |

Dos tornillos para el autor, porque los defectos no valen para todos los casos:

- `optional: true` en la isla o en el atributo: baja un error de compilación a advertencia. Es el
  autor aceptando a conciencia la lectura degradada.
- `required: true`: sube una advertencia a error. Para una `view` cuya ausencia vacía la pieza
  aunque haya prosa.

Y una regla de retención, copiada de `unknownState` de Lexical como manda la decisión 28: **una
isla cuya ranura no se resuelve se conserva íntegra en el documento y se re-serializa byte a
byte**, con todas sus claves, incluidas las que este lector no entiende. Degradar no es
amputar.

## 5. ¿Quién posee la accesibilidad dentro de una ranura?

Es la pregunta donde un contrato laxo destruye lo que la librería acaba de ganar. Un lienzo en
blanco entregado a un autor produce, por defecto, trabajo inaccesible. Y la evidencia del propio
repo dice algo más fino que eso.

### 5.1 Lo que la evidencia dice antes de decidir nada

Los 14 ejemplos que necesitan ranura **ya tienen** su accesibilidad resuelta, y siempre con la
misma forma, que no es la forma de un componente autónomo:

- `StateInvestigatorBoard.tsx`: el SVG es `aria-hidden` con un comentario explícito —«Decorative:
  the same order and the same pairs are written out below»— y el significado va en un
  `role="status"` **en prosa**.
- `MediaImageStack.tsx`, `MediaCaption.tsx`, `MediaEvidenceBoard.tsx`: el dibujo es `role="img"`
  con `aria-label`, y el `aria-label` es **una frase**.
- `TypeRotation.tsx`, `TypeMirror.tsx`: los controles van en un `role="group"` con etiqueta, y
  son `aria-pressed`.
- `Erosion.tsx`, `TypeSparse.tsx`, `Calligram.tsx`, `TypeRotation.tsx`: la aritmética no está en
  JS, está en `--erosion`, `--wear`, `--blanks`, `--tilt`, `--step`.
- `MediaEvidenceBoard.tsx` **deshabilita su control** bajo movimiento reducido.

Es decir: en los catorce, lo accesible es **la prosa, el control y el equivalente textual**, y
esas tres cosas son precisamente **variables, afordancias y frases — las primitivas del
documento**. Lo que queda dentro de la ranura, en los catorce, es el dibujo inerte.

De ahí la tesis, que no es una concesión sino el hallazgo:

> **Una ranura es la representación de un estado, no la dueña de un estado.** La afordancia y el
> equivalente textual se quedan fuera, en el documento, donde el autor ya los está escribiendo.

### 5.2 Lo que la librería se niega a delegar

1. **El nombre accesible y el rol de la región.** La librería emite el contenedor, su rol y su
   nombre, y el nombre sale de prosa del autor. Una `view` es **`aria-hidden` por defecto**. Si
   no es decorativa, declara `a11y: image` **y** `label:` —una frase del documento, interpolable—
   y entonces la librería emite `role="img" aria-label=…` ella misma. El nombre accesible es
   siempre texto autoriado; nunca lo inventa un componente.
2. **Todas las regiones vivas y todos los anuncios.** Una `view` **no puede** renderizar
   `aria-live`, `role="status"` ni `role="alert"`. Este es el punto donde la decisión 14 obliga,
   y conviene escribir el argumento entero: la decisión 14(b) eligió una región oculta aparte,
   vacía hasta el primer giro real, **porque al montar el lector renderiza `Page 1 of 1` y
   repagina un frame después**, así que una línea viva anunciaría un cálculo de layout como si el
   lector hubiera navegado. Una ranura **no puede** hacer esa distinción desde dentro: no sabe si
   está en la pasada de medición, en una repaginación por *resize*, o respondiendo a un lector.
   Con la medición renderizando nodos React (§8), una ranura con `aria-live` anuncia la medición.
   Por eso `announce()` **solo acepta el nombre de una `phrases:`** del documento, y lo que
   escribe pasa por el único anunciador de la librería, que ya sabe callarse.
3. **El equivalente textual.** Si una `view` dibuja algo que significa, el significado existe
   también como prosa en su región. Es lo que los catorce hacen, y es la decisión 14(a) —barras
   decorativas más equivalente textual, en vez de `role="progressbar"`, porque un valor que
   cambia con el scroll hablaría sin parar— generalizada.
4. **El orden de foco y cualquier movimiento de foco.** Las afordancias las emite la librería
   (§2.3) y las coloca la ranura; `:go{show=… focus=true}` (P4) es «un regreso que lleva el foco»
   y es responsabilidad de la librería. Una ranura que mueve el foco pelea con eso. Una `view`
   **no introduce elementos focalizables** que no vengan de `affordance()`.
5. **La política de movimiento reducido.** Una sola fuente: `ctx.motion`, más la misma media
   query en CSS. No N `matchMedia` sueltos. Y la decisión de *deshabilitar* un control bajo
   movimiento reducido es del movimiento, no de la ranura.
6. **El teclado.** Cero escuchas en `document` o `window`. El README promete que la librería no
   instala ninguna; el contrato lo hereda.

### 5.3 Lo que la librería **sí** delega

La composición: la geometría, el SVG, el CSS, el orden visual, la reserva de espacio, la
tipografía dentro de su caja. Es la mitad que el autor tiene que poseer para que la interfaz
pueda ser el relato. Lo que no se delega no es la forma: es el nombre, la voz y el foco.

### 5.4 Lo que se puede comprobar en desarrollo

Sin dependencias nuevas y sin jsdom (la decisión 6 no se toca): estas comprobaciones corren en el
navegador, en el modo de desarrollo del compilador, no en la suite de Node. Coste honesto: no
quedan cubiertas por pruebas unitarias, y eso está en §13.

| Comprobación | Qué caza |
|---|---|
| El subárbol de una `view` no contiene `aria-live`, `role=status/alert`, `tabindex`, ni `aria-hidden="false"` | La ranura hablando por encima del anunciador |
| `a11y: image` sin `label:` | Un dibujo que significa y no se llama de ninguna manera |
| `view` decorativa cuyo subárbol tiene texto que **ninguna** prosa de su región repite | El caso real de trabajo inaccesible: la ranura dice algo que el documento no dice |
| Los props de `affordance()` no llegaron a un elemento interactivo nativo | Un `div` con `onClick` |
| `commit` fuera de gesto, en `pass === "measure"`, o contra revisión vieja | La escritura en montaje, y el doble render |
| `order` cuyo resultado no es una permutación del multiconjunto de entrada | Una ordenación que pierde o duplica salidas |
| `derivation` que muta sus entradas (congeladas en desarrollo) o devuelve algo no serializable | Estado que se escapa por la puerta de las expresiones |
| `AudioContext`, `ResizeObserver`, `setInterval` construidos sin pasar por `hold()` | Recursos que nadie va a cerrar |
| Caja medida en `measure` distinta de la caja en `live` por más de 1px | La clase de bug que produce el bucle de la decisión 19 |
| CSS de la ranura que usa `vw`/`vh`, `rem` fuera de la lista, o un selector `.calamus__*` | Las fugas de viewport (decisión 29) y el acoplamiento a internos |

## 6. ¿Cómo recibe una ranura sus estilos?

**Sí: la herencia dentro de `.calamus-root` es el contrato, y es el único canal.** Una `view` se
renderiza dentro de la raíz, donde todo `--calamus-*` está en alcance. Es lo que el README ya
documenta para `children` en `hypertext`, con su trampa dicha: los tokens se declaran en
`.calamus-root` y en ningún otro sitio, así que fuera no resuelven y no hay *fallback*. El
Pendiente de la decisión 29 ya recomienda declararlos también en `:root`; hasta que se haga, la
consecuencia para una ranura es que **no puede renderizar en un portal fuera de la raíz**.

Lo que una ranura **puede** dar por supuesto:

- El vocabulario público de tokens, menos los doce `terminal*` que `arquitectura-v2.md` §8 borra:
  `--calamus-bg`, `-panel`, `-fg`, `-muted`, `-accent`, `-border`, `-column-gap`, `-serif-font`,
  `-mono-font`, `-max-height`. Los nueve pares de *fallback* de `color-mix()` se conservan y son
  el patrón a imitar.
- Una custom property por cada variable declarada de su proyección, en el **alcance de la
  región** y no en la raíz (A5, P13), con la unidad que el autor declaró (`unit: px`), más
  `--step` / `--depth` por entrada donde la región las emite (P9).
- La container query: `container-name: calamus` está en la raíz, y la región de la ranura recibe
  su propio contenedor `inline-size` cuando declara `needs: [box]`.
- `prefers-reduced-motion` respetado por la librería en su propio *chrome*; la ranura tiene que
  respetarlo en el suyo, en CSS **y** en JS, con `ctx.motion` como única fuente en JS.

Lo que una ranura **no** puede hacer:

- Escribir reglas que casen `.calamus-root` o `.calamus__*`. Son internos, el README ya lo dice
  de las clases, y §8 de la arquitectura va a moverlas.
- Dimensionar en `vw`, `vh` o `rem`. La fuga 4 de la decisión 29 sigue abierta —los suelos y
  techos de los `clamp` siguen en `rem`— así que el contrato no puede pedirle a una ranura que
  herede el problema: `px`, `em`, `ch`, `cqi` y las custom properties del documento.
- Cargar una hoja de estilos en tiempo de ejecución. El CSS de una entrada viaja **con la
  entrada** y el compilador lo inlinea (§9), prefijado con el nombre de la entrada.

Y la regla que hereda de la decisión 29, dicha como consigna: **la aritmética cae en CSS.** Seis
de las nueve ranuras de render ya lo hacen. Cuando un número gobierna el layout y además hace
falta en JS, se lee de vuelta de la misma custom property que gobierna el layout, para que las
dos no puedan discrepar.

## 7. Recursos, desmontaje, y la ranura que se renderiza dos veces

### 7.1 El problema, exacto

`arquitectura-v2.md` §8 registra la pieza nueva de verdad: la medición tiene que pasar de cadenas
a **nodos React renderizados**, porque hoy `Reader.tsx` crea un `<p>` y le pone `textContent`.
Consecuencia inmediata y no hipotética: **una ranura se renderiza fuera de pantalla para medir y
otra vez de verdad.** Una ranura que arranque audio o escriba estado al montar lo haría dos
veces. Y React 18 en modo estricto duplica los efectos por su cuenta, así que son tres
ocasiones, no dos.

### 7.2 La respuesta: las capacidades están **ausentes**, no prohibidas

Una regla escrita en un documento la incumple la primera entrada del registro que tenga prisa.
Así que en la pasada de medición no hay nada que incumplir:

- `ctx.pass === "measure"`.
- `ctx.commit` devuelve `false` sin hacer nada.
- `ctx.announce` es inerte.
- `ctx.affordance` devuelve props con `disabled` y sin `onClick`.
- `ctx.hold` devuelve `null`. **Una ranura tiene que renderizar con `null`**, lo que la obliga a
  ser dibujable sin su recurso — que es exactamente lo que `MediaTone.tsx` ya hace: silencioso
  hasta que se pulsa, con su estado escrito en texto.

Esto **restringe lo que una ranura puede hacer al montar**, y hay que decirlo así: al montar, una
ranura solo puede renderizar. Nada más.

### 7.3 Reservar la caja: la salida para las que no deben medirse dos veces

Mejor que sobrevivir a la doble medición es no medirse. Una isla puede declarar su caja:

````markdown
```calamus
slot: media-tone
reserve: { block: 8.5em }        # o { aspect: 3/2 }, o { rows: 4 }
```
````

Con `reserve:`, el paginador mide **la reserva** —una caja vacía con esas dimensiones— y la
ranura **no se monta nunca para medir**. Es obligatorio para toda entrada que declare
`needs: [gesture]` o `needs: [frame]`, es decir, para las dos de audio y para el tablero animado.
Beneficio lateral: una ranura que reserva su caja no puede desestabilizar la paginación, porque
la paginación no depende de lo que dibuje.

Corolario: **una `view` tiene que caber en la caja que reservó.** Si no cabe, hace scroll interna.
Un cambio de tamaño solo es legítimo cuando lo causa un cambio de una variable de su proyección,
que ya dispara una remedición.

### 7.4 El ciclo de vida del recurso lo posee la librería

```tsx
const voice = ctx.hold(
  "tone",
  (gesture) => { const c = new AudioContext(); void c.resume(); return build(c, gesture); },
  (v) => void v.context.close()
);
```

Garantías de `hold`:

1. **Solo dentro de un gesto.** `acquire` recibe un `Gesture` y solo se invoca desde una
   activación de usuario real. No hay autoplay posible, y es lo que `MediaTone.tsx` ya hace a
   mano: «The AudioContext is built on the first press, never before».
2. **Como máximo uno vivo por `(instance, key)`.** Si el árbol se renderiza dos veces, o React
   duplica el efecto, hay un solo `AudioContext`. El comentario de `MediaTone.tsx` —«The one
   teardown that matters: an AudioContext outlives its component»— pasa de ser disciplina del
   ejemplo a invariante de la librería.
3. **`release` se llama siempre**: al desmontar la región, al reiniciar el documento (`resets:`),
   al navegar a otro nodo, y al descartar la página. Es un `Map` y un efecto: cero dependencias.
4. **Nunca se adquiere en `pass === "measure"`**, porque ahí devuelve `null`.

Y la exigencia que cierra el asunto: **el recurso es de la librería, no del componente.** Si una
entrada construye un `AudioContext` por su cuenta, la comprobación de desarrollo de §5.4 lo
señala con el nombre de la ranura.

## 8. La pureza que el doble render impone, y lo que regala

Para que medir signifique algo, el render de una `view` tiene que ser **función de `ctx`**: misma
`ctx`, misma caja. De ahí tres prohibiciones en el render (no en los manejadores): nada de
aleatoriedad, nada de `Date.now()` afectando al tamaño, nada de leer del DOM.

Lo que parece un coste es el mejor regalo del diseño. `unstable-links` es el ejemplo que **más**
quiere aleatoriedad, y no puede tenerla: si el orden fuera aleatorio, la medición y el render
darían dos listas. La salida es que la inestabilidad sea **función del estado de lectura**, con
la semilla que da el documento (§3.2) — que es lo que el código real hace ya. El doble render
convierte «el orden es aleatorio» en «el orden es una función del recorrido», que es además la
lectura autoriada correcta.

## 9. Resolución en tiempo de compilación (decisión 25)

El entregable es un compilador: entra un documento, sale una carpeta autocontenida. Eso fija seis
cosas.

1. **El registro es un módulo, y los nombres son estáticos.** El compilador importa un manifiesto
   —`{ views, marks, orders, derivations, plurals }`— y cada nombre referido por el documento
   tiene que ser una clave de ese objeto. **Cero `import(nombre)` dinámico, cero `eval`, cero
   `new Function`.** Es lo que mantiene fuera la clase de problema de MDX y de CVE-2026-0969, y
   la regla general que la arquitectura ya escribió: una salida de emergencia que es un lenguaje
   de propósito general deja de ser salida de emergencia.
2. **El mapa es un argumento.** `mount(document, registry)` en la ruta npm; el manifiesto que el
   compilador importa en la ruta CLI. Los dos artefactos, un renderizador. La lección de
   Storyplayer se cumple en los cinco espacios.
3. **Solo se empaqueta lo que el documento nombra.** Un registro de trescientas entradas cuesta
   lo que la pieza use. Es lo que hace viable que la galería entera sea registro.
4. **El documento declara sus dependencias.** Lo que Yarn Spinner no pudo hacer —y por eso la
   corrección de un archivo no era comprobable desde dentro del archivo, y acabaron atornillando
   un IDL lateral— aquí es front matter:

   ```yaml
   uses:
     views:       { route-compare: { roles: [label, series] }, media-tone: { needs: [gesture] } }
     orders:      [unstable]
     derivations: { align: { returns: group } }
   ```

   Con eso, una **segunda implementación** valida el documento sin tener el registro: sabe qué
   nombres hacen falta, de qué clase, con qué roles y con qué necesidades. Es el precedente de
   articy (el esquema viaja con los datos) aplicado a la costura de extensión, y el antídoto
   contra el corolario de Tinderbox: si el evaluador no es parte del contrato portable, el
   documento solo funciona en el programa que lo escribió.
5. **Un documento cuyas ranuras no se resuelven**: el compilador aplica la tabla de §4 —error por
   defecto para `orders`, `derivations` y `marks`; advertencia degradable para `views` con prosa;
   error para `views` sin prosa— y **en todos los casos emite la página**, salvo error. Nunca
   falla en silencio y nunca «arregla» el documento. La verificación es del compilador, no solo
   del editor: la advertencia solo-en-el-editor es el fallo concreto que Yarn Spinner registró.
6. **La página compilada lleva su manifiesto dentro**: una tabla de cada nombre referido, su
   clase, con qué se resolvió, su versión y sus `writes:`. Auditable después del hecho, y es lo
   que permite mirar una página publicada y saber qué podía escribir cada ranura.

## 10. Recorrido: `route-snapshots`

Es el caso más duro de los 32 y el que `conformance/README.md` señala como el que hay que usar
para diseñar la escritura. `PathSnapshots.tsx` necesita cinco cosas: rastros guardados **como
valores**, elegir dos, comparar dos listas **por posición**, un índice de primera divergencia, y
una ranura que **escriba de vuelta**. La suite lo declaró `N` — no es un documento.

**Con este contrato pasa a ser un documento, más una `derivation` y una `view` opcional.** El
paso que lo consigue es §3.2: una `derivation` devuelve valores del formato, no nodos.

### 10.1 El documento

```yaml
---
title: Two walks of the same town
calamus: 1
lang: en
start: quay
uses:
  derivations: { align: { returns: group } }
  views:       { route-compare: { roles: [label, series] } }
variables:
  kept:   { type: list, of: trail, default: [] }
  picked: { type: list, of: kept, max: 2, control: choice, overflow: drop-oldest }
moves:
  keep:
    add: { kept: { name: "Route {count(kept)}", route: trail } }
    resets: trail
  pick:
    toggle: { picked: "{of}" }
names:
  walks: count(kept)
  comparison:
    align: picked          # `align` es un nombre del registro
    by: route              # campo del autor, enlazado al rol `series`
phrases:
  waiting:
    cases: [ { say: "Walks kept: {walks}. Pick two." } ]
  parting:
    on: comparison.part
    cases:
      - when: comparison.same
        say: The two walks are the same, step for step.
      - is: 1
        say: They agree for 1 step, and part at step {comparison.at}.
      - say: They agree for {comparison.part} steps, and part at step {comparison.at}.
```

Cuatro cosas que esto resuelve y que la suite había dado por perdidas:

- **Los rastros guardados como valores** son `kept`, una lista de rastros, y el movimiento `keep`
  es el `add` + `resets` que la suite ya había escrito.
- **Elegir dos** es `control: choice` con `max: 2` y `overflow: drop-oldest`. El `slice(-2)` del
  React —«Two picks at most: three routes held together is a table, not a reading»— es un
  operador declarado, y los botones, sus nombres y su `aria-pressed` los emite la librería.
- **La comparación posicional y el índice de divergencia** son la `derivation` `align`, que
  devuelve un grupo `rows` con campos `{ left, right, same }` más los nombres `part`, `at` y
  `same`. Nada de esto entra en el esquema: `align` es un nombre del registro y `route` es un
  campo del autor.
- **La aritmética `part + 1` desaparece.** La `derivation` devuelve `at` ya en base 1, así que la
  decisión 26 ni se roza. Era uno de los cuatro sitios con aritmética real que la suite había
  catalogado.

Y el pago mayor: **la prosa vuelve al documento.** «They agree for 2 steps, and part at step 3»
es hoy una plantilla dentro de una función de render —uno de los 22 de 32 que
`arquitectura-v2.md` §5 llama el texto más autoriado y menos autoriable de la librería— y aquí es
una `phrases:` con casos ordenados, con su singular, que el React no tiene.

### 10.2 La entrada del registro

```ts
// derivations.align — pura, sin acceso a nada que no se le pase
export const align: Derivation = ({ items, bind }) => {
  const series = items.map((it) => it[bind.series] as readonly string[]);
  if (series.length !== 2) return { rows: [], part: 0, at: 1, same: false };
  const rows = Array.from({ length: Math.max(series[0].length, series[1].length) }, (_, i) => ({
    left: series[0][i] ?? null, right: series[1][i] ?? null,
    same: series[0][i] === series[1][i]
  }));
  const first = rows.findIndex((r) => !r.same);
  const part = first === -1 ? rows.length : first;
  return { rows, part, at: part + 1, same: first === -1 };
};
```

No conoce `route`: lo lee por `bind.series`. No renderiza. No escribe. Devuelve un grupo y tres
nombres, todos serializables.

### 10.3 La región, y la vista

````markdown
```calamus
each: comparison.rows
as: row
label: The two walks, step against step
```

{row.left} · {row.right} — :mark[{row.same}]{kind=agreement}

```calamus
end
```

:with{when="count(picked) < 2"}
{waiting}

:with{when="count(picked) == 2" }
{parting}

```calamus
slot: route-compare
of: comparison.rows
bind: { label: name, series: route }
a11y: decorative
reserve: { block: 12em }
```
````

La `view` dibuja las dos columnas con sus banderas de «shared / differs» — y es **decorativa**,
`aria-hidden`, porque las mismas filas están impresas arriba como prosa. Es literalmente el patrón
que `StateInvestigatorBoard.tsx` ya eligió a mano. Si la entrada `route-compare` no está
registrada, la región cae a la prosa de §4 y el documento **se sigue leyendo entero**: las filas,
la cuenta y la frase de divergencia están todas en el documento.

### 10.4 Y la escritura de vuelta, que es el encargo

Con la elección en el documento, la ranura de `route-snapshots` **no escribe nada**, y eso es la
conclusión correcta: la mejor respuesta a «diseña la escritura de vuelta» fue sacar de la ranura
lo que no tenía que estar dentro. Pero el camino de escritura queda ejercitado y es el mismo que
`investigator-board` necesita de verdad, cuando el autor decide poner la elección **dentro** del
dibujo, porque el blanco está en su geometría:

````markdown
```calamus
slot: route-compare
of: kept
bind: { label: name, series: route }
writes: [pick]
```
````

```tsx
{ctx.items.map((it) => (
  <button key={it[ctx.bind.label]} {...ctx.affordance("pick", { of: it[ctx.bind.label] })} />
))}
```

Traza completa de un clic:

1. El lector pulsa. Hay activación de usuario, `pass === "live"`.
2. `affordance` envuelve `commit("pick", { of: "Route 2" })` con la revisión del render.
3. La librería comprueba: `pick` está en `writes:` (si no, el compilador ya había fallado); la
   carga solo lleva `of`, que el movimiento declara; `"Route 2"` está en el dominio de `kept`; la
   revisión es la actual; el gesto no había gastado su token.
4. Aplica `toggle` sobre `picked`, respetando `max: 2` y `overflow: drop-oldest`.
5. `comparison` se recalcula. `parting` elige su caso. El anunciador de la librería —vacío hasta
   aquí, por la decisión 14(b)— dice la frase **autoriada**.
6. La región se remide una vez. La `view` se vuelve a renderizar con la nueva proyección; su
   reserva no cambió, así que la paginación no se mueve.

Lo que **no** puede pasar en ningún punto: escribir una variable que no esté detrás de un
movimiento; escribir con una forma que el movimiento no declara; escribir mientras se mide;
anunciar texto que el autor no escribió; llevarse el foco; navegar.

## 11. Los catorce, clasificados

| Ejemplo | Clase | Declara | Nota |
|---|---|---|---|
| `calligram`, `erosion`, `sparse-isolation`, `rotated-blocks`, `mirror-text` | `views` | `reserve:`, `a11y: decorative` | La aritmética ya está en `--step`, `--wear`, `--blanks`, `--tilt`. Controles y notas, al documento |
| `investigator-board` | `views` | `writes:`, `a11y: decorative` | El caso canónico de afordancia en geometría propia (§2.3). El SVG ya es `aria-hidden` con su prosa paralela |
| `media-image-stack`, `media-caption` | `views` | `a11y: image` + `label:` | El `aria-label` sale de una frase del documento, no del componente |
| `media-evidence-board` | `views` | `needs: [frame]`, `reserve:` | El tic lo para la librería bajo movimiento reducido; hoy el ejemplo se deshabilita solo |
| `media-tone`, `media-audio-layers` | `views` | `needs: [gesture]`, `reserve:` **obligatoria** | `hold()` posee el `AudioContext`; nunca se montan para medir |
| `narrow-measure` | `views` | `needs: [box]` | No monta observador: la librería mide (§3.3) |
| `unstable-links` | `orders` | semilla del estado | Reconcilia la 21 con la 23: el orden es estructura, y la ranura es un atributo |
| `route-snapshots` | `derivations` + `views` | `bind:`, `writes:` opcional | §10 |
| (`redaction`) | `marks` | `as: cover` + `note:` | No está entre los 14 pero usa el mismo registro, y es la portada de la decisión 20 |

## 12. Cómo se verifica

- **En compilación**: resolución de nombres, clases, roles frente a `bind:`, `writes:` frente a
  `moves:`, `reserve:` obligatoria para `needs: [gesture]`/`[frame]`, coherencia de `uses:` con lo
  que el documento usa de verdad.
- **En desarrollo, en el navegador**: la tabla de §5.4.
- **En la suite de Node, sin DOM** (decisión 6): los reductores de movimiento, la validación de
  cargas, la coalescencia por gesto, el rechazo por revisión, la permutación de una `order`, la
  pureza de una `derivation`, y la tabla de degradación de §4 — todo eso es lógica sin DOM y es
  donde debe estar cubierto.
- **Contra la suite de conformidad**: los 19 documentos se vuelven a intentar con este contrato.
  `route-snapshots` debería pasar de `N` a `A`.

## 13. Lo que queda abierto

1. **La paginación desmonta ranuras, y el audio se muere al girar la hoja.** Si `hold()` está
   atado al montaje, `media-tone` calla al pasar a la hoja siguiente; si está atado al documento,
   un tono sigue sonando desde una hoja que el lector ya no ve. Las dos son defendibles y
   **producen obras distintas**, como `once: true` en A7. Sin resolver, y es la peor de la lista
   porque se decide sola si no se decide.
2. **Depende de A3** (qué es un nodo al renderizar). Si un nodo reemplaza la página, volver a
   entrar remonta la ranura y vuelve a adquirir su recurso; si se revela en sitio, no. El ciclo
   de vida de las ranuras no se puede cerrar antes que A3.
3. **La dependencia circular entre `reserve:` y el contenido.** Una reserva en `em` depende de la
   tipografía, que depende del ancho de la caja, que depende de la paginación. Sospecho que hay
   que prohibir reservas relativas a la tipografía, pero no lo he probado.
4. **Versionado del registro.** Una entrada cambia de forma y las páginas ya compiladas no se
   enteran. El manifiesto lleva versión (§9.6), pero no hay política: ¿qué hace un `mount()` con
   un registro más nuevo que el documento? Lexical y articy tiran en direcciones distintas.
5. **Escapado de texto del lector que entra en `params`** (A12). Con el compilador emitiendo HTML
   es una decisión de seguridad. El contrato dice que `params` son datos, no que estén saneados.
6. **Render en servidor.** El README promete que el lector es seguro en el servidor. Una `view`
   con `needs: [box]` no tiene caja en el servidor: ¿reserva, o no se renderiza?
7. **`derivations` asíncronas**: descartadas por la 25 (página autocontenida), pero no hay quien
   lo diga en voz alta en ningún documento. Debería estar en `decisiones.md`.
8. **Las comprobaciones de §5.4 no tienen pruebas.** Corren en el navegador y la suite es Node
   sin DOM. Es el hueco de accesibilidad automatizada del Pendiente, heredado y ampliado: ahora
   afecta a código de terceros.
9. **`a11y: own`**, la tercera vía para lo irreducible (una ranura que sí tiene que manejar su
   foco). No la he especificado a propósito: prefiero que el primer caso real la escriba. Riesgo
   reconocido: si se añade tarde y con prisa, se convierte en la puerta por la que se va todo lo
   de §5.2.
