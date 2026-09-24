# Arquitectura v2: de modos de lectura a documento narrativo

> Documento de trabajo interno, en español como `decisiones.md`. Reúne cinco análisis
> independientes y propone una arquitectura. **Nada de esto está implementado.** Las
> decisiones abiertas están al final, cada una con una recomendación.
>
> Los análisis completos están en el scratchpad de la sesión: `prior-art.md` (1.191 líneas),
> `requirements-from-examples.md` (633), `conato-authoring.md` (663), `library-assets.md`.

## 1. El problema, con precisión

`calamus` tiene hoy **dos contratos vestidos de uno**.

`scroll`, `book`, `terminal` y `editorial` reciben `{ title, subtitle?, body: string[] }` — un
texto plano — y se diferencian en cómo lo presentan. `hypertext` recibe `children` y **ignora
`content.body` por completo**. No es un quinto modo: es otro producto bajo el mismo prop.

Tres síntomas lo confirman, y los tres son verificables:

- `subtitle` significa cinco cosas distintas en cinco modos. Esa polisemia es la marca de un
  prop sirviendo a dos productos.
- `body` es obligatorio incluso en `hypertext`, donde nunca se renderiza.
- `src/index.ts` exporta solo `Reader` y seis tipos, así que **el paginador medido —la única
  ingeniería sustancial de la librería— es inalcanzable desde fuera.** La arquitectura actual
  encierra el activo caro detrás del prescindible.

Y el hueco real no es ninguno de esos: **la galería de 32 ejemplos enseña lo que sale, nunca
lo que entra.** No hay artefacto autoriado. Una pieza narrativa solo la escribe quien sabe
React, no se serializa, no se versiona, no se edita en una herramienta de escritura y no se
puede mostrar.

## 2. Las cuatro posiciones posibles

Del estudio de Twine (Harlowe, SugarCube, Snowman, Chapbook), ink, Yarn Spinner, ChoiceScript,
Inform 7, MDX, Portable Text, ProseMirror, djot y Storyspace salen **cuatro posiciones
coherentes, y no más**. Todo lo demás es mezcla inestable.

| | Documento | Extensión | Autor | Techo | Suelo |
|---|---|---|---|---|---|
| **A** `children` en crudo | ninguno | todo | programador React | infinito | **inexistente** |
| **B** vocabulario cerrado | datos completos | un enum que envía la librería | escritor, rápido | **duro** | alto |
| **C** esquema estrecho + registro | datos + directivas nombradas | registro que llena el anfitrión | escritor + programador una vez por efecto | infinito | alto |
| **D** Markdown que ya controlas | Markdown con atributos | igual que C | escritor | igual que C | igual que C |

**A es lo de hoy.** Snowman lleva diez años en esa posición dentro de Twine y sigue siendo un
nicho para programadores por diseño explícito. Se conserva como capa; no puede seguir siendo
la respuesta.

**B está descartada por tu propia tesis.** Harlowe llegó a 31 estilos de texto, incluidos
`"smear"` y `"blurrier"` — más lejos de lo que uno espera. Pero no hay un 32.º, y «la forma es
la tesis» significa que la forma de la próxima obra no está en la lista. Peor: un enum que
contenga `"decay"` porque una obra necesita una terminal que se degrada **es el error del
`SceneContract` de la decisión 1**, a un nivel de indirección.

**D no es rival de C: es su fachada.** C decide el modelo de datos, D decide la sintaxis.
Tratarlas como alternativas es la principal forma en que esta decisión puede salir mal.

## 3. El hallazgo que resuelve la paradoja

De **Chapbook**: extensiones **registradas por el anfitrión y referidas por nombre desde el
documento** (`inserts.add` / `modifiers.add`). El motivo por el que su autor las sacó del
estado está escrito en su documentación: *para que todo el estado pueda serializarse a JSON*.

Eso desarma el conflicto entero. La terminal que se degrada sigue siendo React tuyo; el
documento solo dice su nombre y sus parámetros. El documento se serializa, se versiona, se
edita en Conato y se puede enseñar.

Y no es una idea de un solo sistema: inkle (`EXTERNAL` con fallbacks), Sanity (Portable Text),
el linaje de ProseMirror y el autor de Chapbook llegaron ahí **por separado**. Cuando cuatro
diseños independientes convergen, la convergencia es el dato.

## 4. Dónde cae la frontera, medido

De los 32 ejemplos de la galería: **17 se autorían solo con esquema, 14 necesitan una ranura
nombrada, 1 es irreductible.** Pero el reparto por categoría no es opinable:

- Las **siete categorías narrativas**: 80% esquematizable.
- **Tipografía y medios**: 8%.
- **`rewriting`** —la categoría más cercana a lo que pediste, «que solo ciertas partes del
  texto cambien»— : **100%**.

La frontera del esquema cae exactamente sobre la línea entre **lo que el texto dice** y **lo
que la superficie es**. Consecuencia operativa: no hacer crecer el esquema hacia tipografía y
medios; hacer crecer **el contrato de la ranura**, porque 10 de esos 12 ya son «entran datos,
sale un dibujo».

## 5. El centro de gravedad del documento no es el grafo

El hallazgo más contraintuitivo del análisis de requisitos: **26 de los 32 ejemplos terminan
con una frase que le cuenta al lector lo que ha hecho.** «Has estado aquí 3 veces.» «Coinciden
2 pasos, y se separan en el 3.» 22 de 32 la construyen con una plantilla a mano, con
pluralización manual, dentro de una función de render.

Es la segunda persona dirigiéndose al lector sobre el lector — lo que §1.4 del documento de
visión nombra como *el* punto. Es **el texto más autoriado y menos autoriable de la
librería**, y hoy es una cadena de programador en los 32 casos.

Así que el documento no es, en su centro, un grafo de nodos. Es:

> **un conjunto de variables, un rastro, y un cuerpo de prosa donde cualquier frase puede ser
> condicional y cualquier frase puede devolverle el lector a sí mismo.**

Diseñado así, siete de los ejemplos más fuertes son documentos el primer día **sin grafo
ninguno**; el laberinto y la cadena de notas llegan después como tres campos encima. Empezando
por el grafo se acaba con un motor de «elige tu aventura» cuyos mejores ejemplos no lo
necesitan.

## 6. Las cinco primitivas, extraídas de los ejemplos

No inventadas: son las formas que se repiten entre 32 piezas escritas por separado.

1. **Variable** — número, booleano, enum, cadena, lista; opcionalmente persistida. Debe
   emitirse como custom property de CSS, y debe admitir **peso por ítem** para que un número
   produzca N valores. Cinco de diez casos lo hacen, y la aritmética tiene que caer en CSS.
2. **Rastro** — historial ordenado. Debe **conservar duplicados y contarlos**: un `Set` de
   visitados falla tres ejemplos de plano. También: entradas marcables pero no borrables.
3. **Fragmento** — unidad de texto con condición, variantes y marca. Debe funcionar **por
   debajo de la frase** (`body: string[]` no puede sostener esto), distinguir *renderizado
   distinto* de *no renderizado*, llevar **marca con semántica** (`<mark>` frente a `<s>`, no
   un nombre de clase) y llevar **la distancia que va detrás** — en Mallarmé el silencio es
   gramática.
4. **Nodo + salidas** — pares (destino, etiqueta); **ciclos, no árboles**; salidas que se
   cierran al usarse y salidas que no; profundidad como valor; un regreso que lleva el foco.
5. **Expresión** — comparación, conteo sobre el rastro, **agrupación por un atributo que nombra
   el autor con un test cuantificado sobre el grupo**, sustitución ordenada, y plantillas con
   pluralización.

Más **la ranura**: componente nombrado que recibe variables y rastro, y puede escribir de vuelta.

**El lenguaje de expresiones es la pieza que carga el peso, no el grafo.** Un grafo rico con
expresiones pobres falla más de los 32 que al revés.

## 7. La sintaxis: prosa con islas cercadas

Aquí manda un dato duro. El análisis de Conato **midió** su editor contra ~40 constructos:

- Directivas `:::`, corchetes, JSX y HTML se destruyen al primer guardado.
- **Una sola cosa sobrevive byte a byte: el bloque cercado con info string arbitrario.** El
  serializador llama `state.text(node.textContent, false)` — escapado desactivado a propósito.

Así que el formato es **prosa Markdown con islas ```` ```calamus ````**. No es una concesión:
es prosa primero, se lee como escritura y no como configuración, y degrada a Markdown plano en
el resto del ecosistema. Con un NodeView de TipTap encima, el autor ve un editor de opciones en
vez de una caja gris de JSON — pero el formato en disco es válido con o sin él.

## 7bis. El contrato de degradación: diséñalo antes que el de éxito

La lección más fuerte del estudio, y la que casi nadie diseña a tiempo. **Portable Text** tiene
tres comportamientos distintos ante lo desconocido, los tres no fatales (medidos ejecutando la
librería, no leyendo el manual):

- **Marca desconocida → el texto sobrevive.** Se envuelve en un `<span>` con una clase y ya. Se
  pierde el estilo, nunca la prosa. *Esta es la propiedad más valiosa de todo el estudio.*
- **Bloque desconocido → se oculta** sin tumbar la página; el resto del documento se lee.
- **Estilo desconocido → cae a `<p>`.** Lista desconocida → `<ul>`.

Un lector con un renderizador viejo **sigue leyendo la prosa**. Compáralo con el otro extremo:
**ProseMirror lanza `RangeError` y el documento entero no carga** por un solo nodo desconocido.
Es la decisión correcta para un editor —no puedes dejar entrar en un búfer algo que no sabes
editar fielmente— y exactamente la equivocada para un lector.

**Aviso que te toca directamente:** Conato usa TipTap, y el comportamiento por defecto de TipTap
ante un nodo desconocido es `console.warn` **y dejar el documento vacío**. Está en su código:
`return createNodeFromContent('', schema, options)`. Para una herramienta que sostiene un
manuscrito, ese default hay que desactivarlo a conciencia (`enableContentCheck: true` y
`emitContentError`). Nuestro formato de islas cercadas lo esquiva —un bloque de código es un
nodo que TipTap ya conoce— pero si algún día se añade un nodo propio, esto es lo primero.

Y de **Lexical**, la pieza que nadie más tiene: `unknownState` **retiene las claves que no
entiende, las vuelve a serializar al exportar, y las parsea más tarde si aparece una
configuración para ellas.** Compatibilidad hacia adelante como característica, no como error.
Deprecaron su propio campo `version` porque esto es estrictamente mejor. Se copia.

Así que el contrato de degradación de calamus, escrito antes que nada:

| Situación | Comportamiento |
|---|---|
| Directiva desconocida en línea | Renderiza sus hijos como prosa. **Nunca se pierde texto.** |
| Bloque desconocido | Se omite visualmente, se conserva en el documento y se re-serializa. |
| Clave desconocida en un nodo conocido | Se retiene intacta y se re-emite al guardar. |
| Expresión que no evalúa | El fragmento se muestra, no se oculta. Fallar hacia *legible*. |

## 7ter. Cuatro reglas robadas, con su procedencia

**De Storyspace: siete atributos bastaron para el canon.** `$Visits`, `$Requirements`, `$Deck`,
`$OnVisit`, `$BeforeVisit`, `$ResetAction`, `$ChosenWord` sostuvieron *afternoon*, *Victory
Garden* y *Patchwork Girl*. Siete. Y **dos puertas, no una**: la guarda vive en el enlace («¿puedo
salir de aquí?») y `$Requirements` en el nodo («¿se me permite entrar allí?»), porque son
preguntas distintas. La consigna: *resistir un lenguaje de expresiones general todo lo posible*.

**De Storyplayer: un registro en el que no puedes registrar no es un punto de extensión.**
Esquema impecable, condiciones obligatorias en cada arista, JsonLogic como lenguaje portable — y
su mapa de renderizadores es un objeto literal fijo en el código, así que añadir un tipo exige
bifurcar la librería. **El mapa tipo→componente es un argumento, jamás una constante.**

**De articy: el esquema viaja dentro del documento.** Sus `ObjectDefinitions` van junto a los
datos, así que quien recibe el archivo tiene el vocabulario *y* el contenido, y puede validar sin
conocimiento fuera de banda. Existen tres reimplementaciones independientes de su formato. Eso es
lo que parece un formato de intercambio de verdad.

**De Tinderbox: si el runtime es la herramienta, la exportación es un cadáver.** Su XML es
abierto y parseable, pero las guardas, los agentes y las reglas **no están ahí en forma
ejecutable**: solo corren dentro de la app de Mac, y el único lector de terceros que existió está
abandonado, en Python 2.3. Corolario para calamus: **el evaluador tiene que ser parte del
contrato portable**, o el documento solo funciona en el programa que lo escribió.

## 7quater. MDX queda descartado, con causa

No por gusto. Su propia gente lo dice: *«MDX es inherentemente inseguro, soporta JS completo, y
eso es por diseño… El modo seguro es: usa Markdown.»* Y no es teórico — **CVE-2026-0969**,
ejecución remota de código en `next-mdx-remote` renderizando MDX no confiable.

Medido: la ruta sin compilador en el navegador pesa **108 bytes**, pero **exige
`new AsyncFunction`**, es decir CSP con `unsafe-eval`. Con compilador son **131 KB gzipped** —
veinte veces el renderizador entero de Portable Text.

La regla general, y es la que más importa: **una salida de emergencia que es un lenguaje de
propósito general deja de ser salida de emergencia y se convierte en el formato.** En cuanto un
documento puede contener JS arbitrario no tienes esquema, ni edición visual, ni renderizado de
contenido ajeno, ni una segunda implementación: tienes un programa que se parece a la prosa.

**Nota de coste, a favor:** el renderizador oficial de Portable Text son **6.524 bytes
comprimidos** con una sola dependencia real. Y un recorrido de **29 líneas sin un solo import**
maneja bloques propios, marcas propias con datos anidados y objetos en línea. Lo único que ese
recorrido corto hace mal —y por lo que existen los 13 KB de su toolkit— es **fusionar una marca
que cruza varios spans** y **anidar listas**. Si calamus no necesita esas dos, el renderizador se
posee entero, sin dependencias.

## 7quinquies. Dos lecciones de Yarn Spinner que fijan decisiones

**La salida de emergencia lleva nombre declarado y firma, no texto libre — y la declaración va
dentro del propio artefacto.** Los comandos de Yarn se lexan como una cadena opaca
(`COMMAND_TEXT: ~[>{\r\n]+`) y se entregan a un delegado. Consecuencia: **el documento no puede
declarar sus propias dependencias, así que su corrección no es comprobable desde dentro del
archivo.** Lo descubrieron tarde y atornillaron un segundo artefacto para compensar —un IDL
lateral generado escaneando el anfitrión— y aun así sus diagnósticos son advertencias, solo del
editor, ausentes del compilador. El indicio más claro: un enlace roto *entre dos nodos del mismo
archivo* es solo un warning, porque el salto dinámico tenía que seguir siendo legal.

Donde Yarn **sí** acertó es el mismo principio aplicado a tiempo: su marcado de spans resuelve a
una tripleta estructurada `(nombre, posición, longitud, propiedades)` en vez de texto crudo — y
por eso pudo crecer después con propiedades tipadas, interpolación de variables, normalización de
marcadores mal anidados y manejadores de reemplazo, **sin un solo cambio rompedor**.

> Estructura la salida de emergencia y se convierte en punto de extensión. Déjala como cadena y
> se convierte en techo permanente de lo que la herramienta puede prometerle a un escritor.

Y su modelo de span es, además, **la respuesta probada a lo que pediste**: «que solo ciertas
partes del texto cambien» es exactamente `posición + longitud + nombre + propiedades` sobre una
línea, con el texto plano extraído aparte.

**La segunda lección fija la decisión A.** El salto v1→v2 de Yarn rompió **los archivos de los
escritores** y le costó un ecosistema entero. El v2→v3 rompió **el código de los programadores** y
no costó casi nada.

> Si hay que romper algo, rompe el lado que tiene compilador y verificador de tipos. **Nunca el
> lado que sostiene la prosa.**

Aplicado a calamus: el lado de los programadores es la API, hoy con **cero consumidores**. El lado
de la prosa es un formato que aún no existe. Ergo: **romper la API ahora, y no volver a romper el
documento nunca.** Es el argumento más fuerte para hacer esto hoy y no en seis meses, y también
para pensar el formato despacio antes de que exista un solo archivo escrito en él.

## 8. Qué sobrevive de la librería

**Se conserva** (~350 líneas de `src` y ~255 de tests, un tercio): el paginador medido y sus
tests; **el CSS de marco fijo, que es la forma ejecutable de la decisión 19** —el paginador es
correcto por sí solo, el bug de las diez páginas lo previene ese CSS, así que separarlos es
cómo vuelve el bug—; las cuatro invariantes de la receta de medición; el vocabulario de tokens
y los nueve pares de fallback de `color-mix()`; el patrón de anunciador vacío hasta el primer
giro real; `keys.ts` entero; `lang`.

**Se borra** (~430 líneas): `mode` y los cinco componentes de modo; `ReaderContent`; el tiempo
de lectura (contar palabras sobre nodos arbitrarios es imposible, y 250 ppm nunca fue buena
API); la escalera de transiciones; los doce tokens `terminal*`.

El argumento más fuerte es contra `terminal`: es una paleta, una pila mono, tres cadenas y un
porcentaje — y **hace una afirmación de contenido en nombre del autor**, que es justo lo que la
librería no puede hacer si la interfaz es el relato. Como ejemplo de galería se copia y se
altera; como modo solo se acepta entero.

**La pieza nueva de verdad**: la medición tiene que pasar de cadenas a nodos React renderizados.
Hoy `Reader.tsx` crea un `<p>` y le pone `textContent`, así que la librería pagina prosa y nada
más — ni una figura, ni un aparato de notas, ni un componente del autor. Fatal en una
arquitectura estructural. Presupuesto: 150–250 líneas. Todo lo demás es reordenar.

## 9. Coste real de la inversión

- `src/` (1.057 líneas): ~430 se borran, ~250 pasan casi verbatim, ~220 se reestructuran,
  ~150–250 son nuevas. **`src/` encoge o queda igual.**
- Tests: **255 de 421 sobreviven (61%)**, y la asimetría es la regla de «sin jsdom» de la
  decisión 6 pagando exactamente como se esperaba.
- **La galería no se toca.** Ningún archivo de `playground/gallery/*.tsx` importa de `src`, y
  ninguna hoja de la galería referencia una clase `calamus__`. ~2.400 líneas de ejemplos y
  ~1.120 de CSS **portan sin cambios**; su única dependencia son 229 referencias
  `var(--calamus-*)`, que sobreviven si se conserva el vocabulario.
- Lo que sí se reescribe es el armazón del explorador: ~1.100–1.300 líneas de 6.677. **Menos
  del 20%.**
- **Migración de consumidores: cero.** Sin publicar, un consumidor privado y cerrado.

## 9bis. El contrato de salida, y por qué lo decide el de entrada

**Recomendación: un compilador.** Entra un documento, sale una **carpeta autocontenida con
`index.html` en la raíz**. El escritor la publica como página y enlaza a ella, o la enmarca con
dos etiquetas si controla su propio markup. El componente React sigue existiendo como motor
dentro, y se publica en npm para desarrolladores.

**Dos hallazgos lo deciden, y el primero reordena todo lo anterior.**

**1. La pregunta de salida la decide la de entrada, por culpa de `hypertext`.** Medido: los 34
archivos de `playground/gallery/` usan `useState` o `useReducer`, cinco animan SVG y dos
sintetizan audio. **Eso es código, no datos.** Cualquier contrato que no pueda llevar el código
del autor amputa justo el modo para el que existe el rediseño.

La conciliación con las secciones anteriores —y es importante no confundirlas— es que hay **tres
artefactos, no uno**:

| Artefacto | Qué es | Quién lo escribe |
|---|---|---|
| **Documento autoriado** | prosa Markdown con islas cercadas | el escritor, en Conato |
| **Registro** | los componentes que resuelven las directivas por nombre | el programador, una vez por efecto |
| **Página compilada** | HTML autocontenido | el compilador |

Los 34 ejemplos de la galería **no son documentos: son entradas del registro.** Esa distinción es
la que evita el error de creer que el documento tiene que llevar código dentro.

**2. calamus está escrito como si fuera dueño del viewport.** Cuatro fugas medidas, y la primera
es un **bug vivo que contradice la funcionalidad de la decisión 18**:

- `EditorialReader.tsx:41` decide la cuenta de columnas con `window.matchMedia("(min-width: 768px)")`
  — **el viewport, no el contenedor.** Una tarjeta de 380px en un escritorio ancho recibe dos
  columnas de 170px. Publicamos `maxHeight: "100%"` para meter el lector en una caja y esto lo
  deja a medias.
- Tipografía fluida por `vw` (`clamp(1.7rem, 2.9vw, 2.3rem)` y tres más).
- `78vh` como altura por defecto, en seis sitios.
- Todo dimensionado en `rem`, que hereda del documento anfitrión.

**El hallazgo negativo más útil: el shadow DOM no aísla `rem`, `vw`, `vh` ni una media query** —
exactamente las cuatro cosas que rompen calamus. Es la respuesta refleja y la peor relación
coste/beneficio del conjunto: pagas el bundle de React y el problema de los slots para bloquear
reglas `p {}` del anfitrión, que el prefijo `calamus__` ya evita. Un iframe aísla las cuatro,
gratis.

**Y el dato que reencuadra el encargo: la mayoría de los escritores no pueden embeber nada.**
Substack, Medium, Notion, WordPress.com gratuito y Squarespace Personal eliminan scripts *e*
iframes; solo despliegan URLs de una lista blanca en la que calamus nunca va a estar. Así que
quien **puede** pegar HTML es, por definición, alguien que controla su markup — o sea, técnico.
**Una página propia a la que enlazar es el único contrato que alcanza a los dos grupos.**

### Coste, sin adornos

- **Un CLI que no existe.** La pieza de trabajo más grande. La tensión con «cero dependencias» se
  resuelve como lo hizo Twine: sustitución de plantillas sobre el `dist/` ya compilado, `fs` y
  concatenación de cadenas, de modo que el escritor no instala nada.
- **~53 KB gzip** de salida — medido: la librería son 7,7 KB y React con React-DOM 45,1 KB. **El
  runtime es 5,9 veces la librería.** Aceptable para una página.
- **Mueren tres promesas:** el CSS del anfitrión ya no puede estilar el lector, su tipografía no
  se hereda, y nada puede desbordar el marco.
- **Los 32 ejemplos no portan como documentos.** Son React — son registro. El formato de cara al
  escritor necesita sus propios ejemplos, que es un proyecto de documentación entero y es fácil
  dejarlo fuera de la estimación.

### El modo de fallo más probable

**El bucle de la decisión 19, resucitado al otro lado de una frontera de proceso.** Dentro de un
iframe de altura automática, `78vh` es el 78% de la altura que el propio protocolo está tratando
de calcular — la misma dependencia que la decisión 19 eliminó, pero ahora el `ResizeObserver`
solo ve un lado, así que se presenta como **parpadeo misterioso** y no como un bug reconocible.
El CSSWG rechazó la altura automática nativa en iframes en buena parte por esto. Prevención:
altura explícita y no relativa al viewport siempre; fija o por proporción por defecto; automática
solo opt-in y acotada.

### Dos cosas que conviene hacer ya, decidas lo que decidas

1. **Container queries.** `container-type: inline-size` en `.calamus-root`, `vw` → `cqi`, y borrar
   la llamada a `matchMedia` a favor de `@container`. Arregla tres de las cuatro fugas y
   **elimina** una dependencia de JS y del DOM, sin cambiar la API. Es el mayor valor por línea de
   todo el análisis.
2. **Declarar también los tokens en `:root`.** El commit `80a3d99` de hoy llegó a la misma
   conclusión por el otro lado: la trampa de `.calamus-root` atrapó al explorador cuatro veces. Se
   parcheó en `playground/`, así que **sigue viva para quien consuma la librería** y el arreglo
   está donde puede desincronizarse.

## 10. Decisiones

**A, B, D y E quedaron decididas el 2026-09-24** y están registradas como decisiones 22 a 25 en
`decisiones.md`, con su razonamiento completo. Las cuatro fueron hacia el diseño más ambicioso:
un solo contrato, la navegación en el documento, paginación híbrida y un compilador.

Lo que sigue abierto

| # | Decisión | Recomendación |
|---|---|---|
| A | ¿`body: string[]` se vuelve el caso degenerado del documento nuevo? | **Sí.** Colapsa los dos contratos en uno en vez de apilarlos. Es lo más ambicioso y lo más coherente, y es breaking — pero rompe el lado de los programadores, que hoy tiene cero consumidores, no el de la prosa, que aún no existe. Yarn perdió un ecosistema por romper al revés. |
| B | ¿El documento posee la navegación, o el anfitrión? | **El documento.** El laberinto y los cinco `Path*` son estructura, no presentación. Pero es bifurcación real. |
| C | Sintaxis de las condiciones | **Restringir a comparaciones contra variables y conteos de visita; rechazar aritmética.** Todo sistema con condiciones inventó un lenguajito y en todos es la parte más fea. Storyspace sostuvo el canon entero con siete atributos y **dos puertas** —guarda en el enlace, requisito en el nodo—, que es la restricción a imitar. |
| D | ¿CSS columns sustituye a la paginación medida? | **Híbrido.** Columnas CSS para el interior de la hoja, contenedor con scroll-snap para las hojas, y **una** medición (`scrollWidth/clientWidth`) para cuenta e índice. Mata el bucle de la decisión 19 y hace *imposible* la inestabilidad de sub-píxel. |
| E | Contrato de salida (embebido) | **Un compilador**: entra documento, sale carpeta autocontenida con `index.html`. El componente React sigue publicándose en npm para desarrolladores. **Dos artefactos, un renderizador, un formato de documento** — y la costura es el documento más una llamada a `mount()`, **nunca el renderizador**: si el compilador reimplementa el lector en JS plano para ahorrar los 45 KB de React, lo primero que diverge es el bucle de medición de la paginación, que ya produjo las decisiones 10 y 19 y el pendiente de sub-píxel. |
| F | Sintaxis de las directivas | `remark-directive` da exactamente las tres granularidades que hacen falta —en línea, de bloque y envolvente— con nombre, atributos e hijos, medido. **Pero sus atributos son solo cadenas**: `0.7` vuelve como `"0.7"` y no hay forma de anidar datos. Para las ranuras con payload rico, isla cercada; para la variación de una frase, directiva. |
| H | Fugas de viewport | **Container queries ya**, con o sin inversión. `EditorialReader.tsx:41` decide las columnas por el viewport y no por la caja: es un bug vivo que contradice la decisión 18, que publicamos hoy. |
| G | Contrato de degradación | **Diseñarlo antes que el de éxito**, con los cuatro casos de la sección 7bis. Es la decisión que ningún sistema toma a tiempo y todos lamentan. |

## 11. Por dónde empezar

La decisión 21 regaló una **suite de conformidad gratis**: reescribir cada ejemplo de nivel A
como documento **antes** de escribir el intérprete. Si hace falta una función nueva, la función
está ganada. Si hace falta una palabra clave que sirve a un solo ejemplo, ese ejemplo va detrás
de una ranura.

Y una regla de agnosticismo que los ejemplos implican, más concreta que la actual:

> **Todo nombre de atributo autoriado pertenece al autor; el esquema solo aporta operadores.**

`Two accounts` codifica `transcript`/`log` y `Disputed hour` codifica `gate`/`warden` **como
nombres de campo**. Es la misma clase de fuga que castigó la decisión 1.
