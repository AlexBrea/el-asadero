# El Asadero

Juego 3D de peleas de animales en modo infinito, con login, registro y ranking online (Firebase).

## Desarrollo local

Ejecuta `npm run dev` y abre http://localhost:8000. No hace falta instalar dependencias.
El juego utiliza módulos ES y carga un catálogo JSON: hay que servirlo por HTTP, en lugar de abrir `index.html` con `file://`.

Para las herramientas de desarrollo, utiliza Node 24 (`nvm use`) y ejecuta `npm ci`. Las dependencias npm son solo de desarrollo: no se cargan en el juego.

## Organización

- `index.html`: estructura de la interfaz y carga de los scripts.
- `assets/css/game.css`: estilos base del juego; `features.css`: tienda, especializaciones y funciones incorporadas de main; `interface.css`: interfaz, rarezas y adaptación a móviles.
- `assets/data/game.json`: mejoras, rarezas, probabilidades, especies, modelos, skins, escenarios y balance.
- `assets/js/main.js` y `config.js`: arranque, carga de datos y errores de inicio.
- `assets/js/game.js`: composición de una sesión e instalación de sus dependencias.
- `assets/js/features/`: módulos de combate, rondas, modelos, cámara, audio, especializaciones, reliquias, tienda, logros, cuenta y guardado. Comparten únicamente el registro de su sesión; no dependen de variables globales.
- `assets/js/integration.js`: conecta estas funciones con las rarezas ponderadas, la interfaz accesible y la entrada al ring.
- `assets/js/upgrade-ui.js`: cartas de mejora y explicación de las probabilidades.
- `assets/js/loop.js` y `background-ticker.js`: reloj compartido para primer y segundo plano, pasos acotados y limpieza del worker.
- `assets/js/simulation.js`: colecciones reutilizables y limpieza de partículas sin reasignar arrays.
- `assets/js/features/team.js`: estadísticas, requisitos y generación reproducible de rivales; limita a siete enemigos y mantiene los jefes en solitario.
- `assets/js/profile.js`: nombres, niveles y persistencia local con tolerancia a errores.
- `assets/js/catalog.js` y `types.js`: validación, metadatos inmutables y contratos JSDoc compartidos.
- `assets/js/motion.js` y `assets/css/motion.css`: animaciones nativas de interfaz y sus tiempos compartidos.
- `assets/icons.svg` y `assets/js/icons.js`: sistema de iconos SVG local, sin fuentes ni servicios externos.

La extensión de Chrome se mantiene localmente: `/chrome-extension/` está excluida en `.gitignore`.

## Rarezas

| Rareza     | Probabilidad base | Mejoras                                                |
| ---------- | ----------------- | ------------------------------------------------------ |
| Común      | 55%               | Músculos, vida, velocidad, armadura                    |
| Rara       | 28%               | Fuego, vampirismo, bandada                             |
| Épica      | 13%               | Pico de oro, láser, huevos explosivos, tormenta, robot |
| Legendaria | 4%                | Fénix, titán                                           |

En cada extracción se elige primero una rareza y después una mejora disponible de esa categoría. Las tres ofertas son distintas. Cuando una categoría se queda sin mejoras elegibles, su probabilidad se reparte proporcionalmente entre las restantes. Los porcentajes son por extracción, no la probabilidad de ver una rareza en el conjunto de tres cartas.

Desde la ronda 5 se elige una especialización entre dos opciones. Si quedan mejoras exclusivas disponibles, se garantiza una carta de especialización y se sortean las otras dos con los pesos anteriores. Las definitivas aparecen al alcanzar el nivel máximo de su mejora.

Los niveles máximos y requisitos siguen siendo independientes de la rareza. Por ejemplo, Titán requiere Robot; Fénix no aparece si ya existe uno disponible en el equipo. Los premios de jefe conservan sus dos elecciones, precedidas de una reliquia y una apuesta opcional. Si se agotan todas las mejoras, se puede continuar al siguiente combate.

Para ajustar las probabilidades, edita `rarities.*.weight` en el catálogo, manteniendo una suma de 100. Cada mejora define su `rarity`, `icon`, descripción y máximo.

## Comprobaciones

- `npm run check`: ESLint, contratos JSDoc, formato y pruebas. También se ejecuta en GitHub Actions al subir código o abrir una PR.
- `npm run format`: aplicar el formato del repositorio.
- `npm test`: distribución estadística, requisitos, catálogo, reloj, persistencia y colecciones del simulador.
- `npm run test:browser`: Chrome con perfil temporal, modo invitado sin Firebase, arranque de módulos, cartas en cinco tamaños, selección de aliado, combate, premios de jefe, las seis especializaciones y sus definitivas, partidas guardadas, tienda y pase de batalla. Genera capturas en el directorio temporal.

La prueba de navegador busca Chrome en su ruta habitual de macOS. En otros sistemas puedes indicar el ejecutable con `ASADERO_CHROME=/ruta/a/chrome npm run test:browser`.
La comprobación de móviles en Chrome valida el espacio y los controles; el tacto, el teclado y las áreas seguras requieren una revisión en un teléfono real.

## Estándar de código

Se utiliza JavaScript con módulos ES, sangría de dos espacios, comillas simples, punto y coma y llaves explícitas. `.editorconfig`, Prettier y ESLint definen las reglas ejecutables; no hay que ajustar el formato manualmente.

Las APIs exportadas y las operaciones complejas documentan con JSDoc sus entradas, salidas, unidades y efectos sobre el estado. El catálogo se valida y congela al cargarlo; la progresión y las entidades de combate son los objetos mutables. Las claves compactas de los miembros (`k`, `t`, `l`) forman parte del formato de guardado y requieren una migración si se cambian.

Las funciones nuevas de main se mantienen: cosméticos y equipamiento, misiones diarias, pase mensual, logros, estadísticas y partidas reanudables. Los catálogos de estas funciones están en el JSON y sus estilos en CSS.

Los pasos de simulación reciben segundos. El reloj y la generación aleatoria admiten dependencias inyectadas para que sus pruebas sean deterministas. Las colecciones de trabajo del combate se reutilizan: no se deben retener sus resultados entre actualizaciones. Las optimizaciones del bucle deben conservar el orden de dibujo, los objetivos válidos y la resolución de las muertes; las pruebas de rendimiento no deben depender de umbrales de tiempo en CI.

## Animaciones de interfaz

Se usa CSS y Web Animations API, sin añadir una librería al juego. Las cartas entran en 200 ms con 40 ms de desfase, limitado a 80 ms en grupos grandes. Se animan `transform` y `opacity`; los avisos mantienen una pausa para poder leerlos. Las ventanas y el panel tienen salidas de 140 ms cuando el navegador admite transiciones de `display`.

La selección se procesa inmediatamente, sin esperar a que termine la animación. Al navegar con teclado se cancela el movimiento y las acciones son instantáneas. `prefers-reduced-motion` usa fundidos de 120 ms sin desplazamientos ni desfases. Los listeners, las animaciones y los temporizadores se limpian al cerrar la sesión de interfaz.

Al comenzar una partida, la gallina real entra caminando por el frente abierto del ring hasta su posición. La cámara abre ligeramente el plano y recupera su encuadre mientras avanza. La secuencia dura 2,4 segundos y termina directamente en las mejoras iniciales. Se puede saltar con el botón o Escape; se omite con movimiento reducido y al iniciar con teclado. No aparece entre rondas.

## 1. Configurar Firebase

1. Entra en https://console.firebase.google.com y crea un proyecto (Analytics no hace falta).
2. **Añadir app web** (icono `</>`): copia el objeto `firebaseConfig` y pégalo en `firebase-config.js`.
3. **Authentication → Comenzar → Método de acceso → Correo electrónico/contraseña** → activar.
4. **Firestore Database → Crear base de datos** (modo producción, región `eur3`).
5. Pestaña **Reglas** de Firestore: pega el contenido de `firestore.rules` y **Publicar**.
6. **Authentication → Configuración → Dominios autorizados** → añade `castellon-acm.github.io`.

> La `apiKey` de Firebase es pública por diseño; la seguridad la dan las reglas de Firestore.

## 2. Publicar con GitHub Pages

Repo → **Settings → Pages** → _Deploy from a branch_ → `main` / `(root)` → Save.

URL pública: https://castellon-acm.github.io/el-asadero/

## Cómo funciona

- Los usuarios se registran con _usuario + contraseña_ (internamente `usuario@elasadero.game`).
- Ranking en Firestore: colección `ranking/{uid}` = `{username, best, updatedAt}`.
- Al terminar una partida se guarda la ronda más alta alcanzada, solo si supera la anterior.
- Sin Firebase configurado el juego funciona en modo "Invitado" (sin ranking).
