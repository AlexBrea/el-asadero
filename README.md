# El Asadero

Juego 3D de peleas de animales en modo infinito, con login, registro y ranking online (Firebase).

## 1. Configurar Firebase

1. Entra en https://console.firebase.google.com y crea un proyecto (Analytics no hace falta).
2. **Añadir app web** (icono `</>`): copia el objeto `firebaseConfig` y pégalo en `firebase-config.js`.
3. **Authentication → Comenzar → Método de acceso → Correo electrónico/contraseña** → activar.
4. **Firestore Database → Crear base de datos** (modo producción, región `eur3`).
5. Pestaña **Reglas** de Firestore: pega el contenido de `firestore.rules` y **Publicar**.
6. **Authentication → Configuración → Dominios autorizados** → añade `castellon-acm.github.io`.

> La `apiKey` de Firebase es pública por diseño; la seguridad la dan las reglas de Firestore.

## 2. Publicar con GitHub Pages

Repo → **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Save.

URL pública: https://castellon-acm.github.io/el-asadero/

## Cómo funciona

- Los usuarios se registran con *usuario + contraseña* (internamente `usuario@elasadero.game`).
- Ranking en Firestore: colección `ranking/{uid}` = `{username, best, updatedAt}`.
- Al terminar una partida se guarda la ronda más alta alcanzada, solo si supera la anterior.
- Sin Firebase configurado el juego funciona en modo "Invitado" (sin ranking).
