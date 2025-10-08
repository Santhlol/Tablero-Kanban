# Tablero Kanban

Este repositorio contiene el backend (NestJS), frontend (Vite + Svelte) y las automatizaciones de n8n para el tablero Kanban utilizado en la prueba técnica.

## Requisitos

- Node.js 18+
- pnpm o npm (el proyecto incluye `package-lock.json`, por lo que se recomienda `npm`)
- Docker y Docker Compose (para ejecutar n8n y MongoDB desde contenedores)

## Configuración inicial

1. Duplica el archivo `.env.example` y renómbralo como `.env`.
2. Ajusta las variables para que apunten a tus servicios locales o remotos.
3. Instala las dependencias del backend y frontend:

```bash
cd backend/api-kanban
npm install

cd ../../frontend
npm install
```

## Ejecutar el backend (API)

```bash
cd backend/api-kanban
npm run start:dev
```

La API se expone en `http://localhost:3000/api` por defecto y requiere una instancia de MongoDB accesible mediante `MONGODB_URI`.

## Ejecutar el frontend

```bash
cd frontend
npm run dev
```

Por defecto la interfaz se servirá en `http://localhost:5173` y consumirá la API definida en `VITE_API_URL`.

## Automatización en n8n

En la raíz del repositorio se incluye un `docker-compose.yml` que levanta MongoDB y n8n con la versión `1.106.3`. Para ejecutarlo:

```bash
docker compose up -d
```

Una vez que n8n esté en ejecución visita `http://localhost:5678` y sigue las instrucciones detalladas en [`n8n/setup-instructions.md`](n8n/setup-instructions.md) para importar y activar el workflow ubicado en `n8n/workflow.json`.

## Variables de entorno relevantes

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto donde se expone la API de NestJS. |
| `MONGODB_URI` | Cadena de conexión utilizada por la API. |
| `VITE_API_URL` | URL base para las peticiones HTTP del frontend. |
| `VITE_API_WS` | Endpoint del WebSocket usado para actualizaciones en tiempo real. |
| `KANBAN_API_URL` | URL base que utiliza n8n para consultar la API. |
| `N8N_*` | Parámetros de autenticación y configuración de n8n. |

## Pruebas del workflow

Envía una petición POST a la URL del webhook que n8n genere (ej. `http://localhost:5678/webhook/export-backlog`) con un payload como:

```json
{
  "boardId": "663fa901c72f901d48b78910",
  "to": "usuario@dominio.com",
  "fields": ["id", "title", "description", "column", "createdAt"]
}
```

El flujo descargará el backlog desde la API, generará un CSV y lo enviará como adjunto al correo especificado.
