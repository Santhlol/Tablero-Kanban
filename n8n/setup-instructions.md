# Configuración del flujo de exportación en n8n

Estas instrucciones describen cómo ejecutar el flujo definido en `workflow.json` para automatizar la exportación del backlog del tablero Kanban y su envío por correo electrónico.

## 1. Prerrequisitos

- Docker y Docker Compose instalados.
- Acceso a las credenciales SMTP que utilizará n8n para enviar correos.
- La API del tablero Kanban corriendo y accesible desde la red donde se ejecute n8n.

## 2. Preparar el archivo de entorno

1. Duplica `.env.example` en la raíz del repositorio y renómbralo a `.env`.
2. Actualiza los valores para que coincidan con tu entorno:
   - `KANBAN_API_URL` debe apuntar al endpoint público de la API (incluye el prefijo `/api`).
   - Define credenciales seguras para `N8N_BASIC_AUTH_*` y un valor aleatorio largo para `N8N_ENCRYPTION_KEY`.
   - Establece `N8N_EMAIL_FROM` con la dirección que se usará como remitente en los correos.

## 3. Levantar la infraestructura

1. Ejecuta `docker compose up -d` en la raíz del proyecto para iniciar MongoDB y n8n.
2. Accede a `http://localhost:5678` (o el puerto configurado en `N8N_PORT`).
3. Inicia sesión con las credenciales definidas mediante `N8N_BASIC_AUTH_USER` y `N8N_BASIC_AUTH_PASSWORD`.

## 4. Configurar credenciales SMTP en n8n

1. Dentro de n8n, abre la sección **Credentials**.
2. Crea una credencial de tipo **SMTP** llamada `SMTP account` (debe coincidir con el nombre referenciado por el workflow).
3. Introduce el host, puerto, usuario y contraseña proporcionados por tu servicio de correo.
4. Guarda la credencial.

## 5. Importar y activar el workflow

1. Desde el panel principal de n8n selecciona **Workflows → Import from File**.
2. Carga el archivo `n8n/workflow.json` incluido en este repositorio.
3. Verifica que cada nodo esté correctamente conectado:
   - `Webhook (Export Backlog)` recibe las peticiones POST.
   - Los nodos `Tasks` y `Columns` consultan la API usando `KANBAN_API_URL`.
   - El nodo `Code` procesa las tareas y genera el dataset CSV.
   - `Convert to File (CSV)` y `Send Email` adjuntan y envían el reporte.
4. Activa el workflow y copia la URL del webhook que n8n mostrará. Debería tener la forma `https://<host>/webhook/export-backlog`.

## 6. Probar la automatización

Puedes probar la automatización enviando una petición POST al webhook con un payload similar al siguiente:

```json
{
  "boardId": "<ID del tablero>",
  "to": "destinatario@dominio.com",
  "fields": ["id", "title", "description", "column", "createdAt"]
}
```

El workflow realizará estas acciones:

1. Recuperará todas las tareas y columnas desde la API de Kanban usando el ID del tablero.
2. Construirá un CSV ordenado por columnas y lo convertirá en un archivo.
3. Enviará el correo al destinatario con el archivo adjunto.

Si necesitas depurar el flujo, ejecuta los nodos de manera manual en el editor de n8n y revisa la pestaña **Execution data** para inspeccionar la salida de cada paso.

## 7. Apagar los servicios

Cuando termines, ejecuta `docker compose down` para detener los contenedores. Si deseas eliminar los volúmenes (incluyendo datos de n8n y MongoDB), añade la opción `-v` al comando.
