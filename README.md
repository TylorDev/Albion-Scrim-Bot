# Bot de scrims para Discord

Este bot usa Prisma con PostgreSQL para guardar jugadores, drafts, configuracion de scrims y estados auxiliares del registro. Tambien queda preparado para desplegarse en Railway sin pasos manuales extra.

## Requisitos

- Node.js 18 o superior
- Un bot creado en el portal de desarrolladores de Discord
- Permisos del bot para entrar a tu servidor
- Una base de datos PostgreSQL

## Configuracion

1. Copia `.env.example` a `.env`
2. Completa:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID` o `GUILD_IDS`
   - `DATABASE_URL="postgresql://usuario:password@host:5432/base?schema=public"`
3. Instala dependencias:

```bash
npm install
```

4. Aplica migraciones:

```bash
npm run db:deploy
```

Para desarrollo local tambien puedes usar:

```bash
npm run db:migrate
```

5. Si quieres fake de prueba, usa:

```bash
npm run db:seed
```

o el comando `/test`.

6. Inicia el bot:

```bash
npm start
```

## Uso

- `/scrim`: reinicia el pool activo y publica un panel con `Registrarse` y `Cancelar registro`
- `/scrimfake`: carga automaticamente 8 DPS fake aleatorios y los 2 mismos healers fake, luego publica el panel
- `/pelea`: arma 2 equipos equilibrados de 5 jugadores con 1 healer por team y muestra botones de resultado para admins
- `/ranking`: muestra el ranking general por MMR

## Varios servidores

- Si usas un solo servidor, puedes dejar `GUILD_ID`
- Si usas varios, usa `GUILD_IDS` separados por comas
- Ejemplo: `GUILD_IDS=111111111111111111,222222222222222222,333333333333333333`

## Reglas actuales

- `/pelea` exige exactamente 10 jugadores activos
- Debe haber exactamente 2 healers en el pool, uno por cada equipo
- Los botones `Equipo 1`, `Equipo 2` y `Empate` solo los puede pulsar un admin
- Para jugadores reales, el bot marca automaticamente como healer a quien tenga un rol con `heal`, `healer` o `support` en el nombre

## Estructura

- `src/config`: variables de entorno
- `src/constants`: nombres de comandos y botones
- `src/database`: Prisma, cliente e inicializacion
- `src/data`: acceso a jugadores, drafts y scrims
- `src/discord`: cliente, comandos y handlers de interacciones
- `src/services`: matchmaking, simulacion y MMR
- `src/ui`: embeds y componentes del panel

## Railway

El repo incluye `railway.toml` para que Railway ejecute:

- `npm run db:deploy` antes del deploy
- `npm start` para iniciar el bot

Variables que debes definir en Railway:

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID` o `GUILD_IDS`
- `DATABASE_URL`

Si agregas un servicio PostgreSQL dentro del mismo proyecto de Railway, normalmente `DATABASE_URL` se puede vincular directamente desde ese servicio.

## Migracion desde la version legacy

- La app ya no usa SQLite ni archivos JSON para configuracion persistente.
- En el primer arranque, si detecta archivos legacy en `data/`, importa `settings`, `scrim-config`, `manual-healers` y `manual-tanks` a PostgreSQL.
- Los registros relacionales del bot ahora viven en Prisma/PostgreSQL mediante migraciones versionadas en `prisma/migrations`.

