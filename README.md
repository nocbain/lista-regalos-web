# Lista de regalos

Página web para guardar listas de regalos. La página:

- guarda cada regalo con su foto, sus tiendas, su precio objetivo y sus notas;
- guarda el historial de precios de cada tienda y lo muestra en un gráfico;
- destaca en verde los regalos en oferta: cuando el precio baja o cuando llega al precio objetivo.

Una GitHub Action busca los precios y las fotos una vez al día.

## Cómo está organizado

El sistema usa **dos repositorios**:

| Repositorio | Visibilidad | Contenido |
|---|---|---|
| Código (este) | Público | La página web (`docs/`), el script de precios (`precios/`) y las herramientas. |
| Datos | **Privado** | Las listas (`listas/*.json`), las fotos (`fotos/`) y la Action diaria. |

La página se publica con GitHub Pages desde la carpeta `docs/`. No contiene datos. Lee y guarda los datos en el repositorio privado con la API de GitHub y un token. El token se guarda solo en el navegador de la persona que lo escribe.

Sin el token, una persona que abre la página solo ve la pantalla «Conectar».

## Puesta en marcha

### 1. Repositorio de código (público)

1. Sube este código a un repositorio público.
2. Abre **Settings → Pages**.
3. En «Build and deployment», elige **Deploy from a branch**, la rama `main` y la carpeta `/docs`.
4. Espera a que GitHub publique la página. La dirección aparece en la misma pantalla.

### 2. Repositorio de datos (privado)

1. Crea un repositorio **privado** (`nocbain/lista-regalos-datos`).
2. Copia en él el archivo `plantilla_datos/.github/workflows/actualizar_precios.yml` en la misma ruta (`.github/workflows/`).
3. Abre **Settings → Secrets and variables → Actions → Variables** y crea la variable `REPO_CODIGO` con el nombre del repositorio de código (`nocbain/lista-regalos-web`).
4. Abre la pestaña **Actions → Actualizar precios → Run workflow** para hacer la primera ejecución. Si falla al guardar con un error de permisos, abre **Settings → Actions → General → Workflow permissions** y elige **Read and write permissions**.

### 3. Token para la página

1. En GitHub, abre **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. En «Repository access», elige **Only select repositories** y elige solo el repositorio de datos.
3. En «Permissions», da a **Contents** el valor **Read and write**.
4. Copia el token.
5. Abre la página. Escribe el repositorio de datos (`usuario/nombre`) y pega el token.

El token caduca en la fecha que eliges al crearlo. Cuando caduca, la página pide uno nuevo.

### 4. Pasar las listas antiguas de claude.ai

Las listas antiguas eran páginas HTML con los datos dentro. Para pasarlas al repositorio de datos:

```bash
python3 herramientas/exportar_artifact.py elena.html CARPETA_DEL_REPO_DE_DATOS --nombre elena --propietario Elena
```

La herramienta escribe `listas/elena.json` y guarda cada foto en `fotos/`. También quita las entradas del historial que no tienen fecha.

## Cómo se buscan los precios

El script `precios/actualizar_precios.py` lee cada lista y, para cada regalo que no está conseguido:

1. **Enlace de Klarna** (`klarna.com/es/shopping/pl/...`): lee el precio de cada tienda de la ficha de Klarna.
2. **Enlace de otra tienda**: lee el precio de los datos estructurados de la página (JSON-LD), si la tienda los publica (por ejemplo, IKEA).
3. **Foto**: si el regalo no tiene foto, guarda la foto del producto en `fotos/`.

El script respeta `robots.txt`, se identifica con su propio nombre y espera 3 segundos entre peticiones.

**Límites conocidos:**

- El script no consulta Amazon, El Corte Inglés, MediaMarkt, PcComponentes, Fnac, Decathlon, Zalando, Worten, Carrefour, Sephora, LEGO ni idealo. Estas tiendas respondieron con un bloqueo (error 403) a las peticiones automáticas. Para estos regalos, usa el enlace de Klarna del producto o escribe el precio con «Actualizar precios».
- Un regalo sin enlace no recibe precios automáticos.
- No está comprobado si Klarna acepta las peticiones que salen de los servidores de GitHub Actions. El informe de cada ejecución muestra los errores (pestaña **Actions** del repositorio de datos).

Para lanzar la actualización a mano: pestaña **Actions → Actualizar precios → Run workflow**.

## Cuándo un regalo está «en oferta»

Un regalo que no está conseguido está en oferta cuando el mejor precio cumple una de estas condiciones:

- es más bajo que el precio anterior de la misma tienda;
- es igual o más bajo que el precio objetivo del regalo.

## Formato de los datos

`listas/<nombre>.json`:

```json
{
  "version": 2,
  "owner_name": "Elena",
  "items": [
    {
      "id": "abc123",
      "name": "Sérum de pestañas",
      "priority": "alta | media | baja",
      "category": "belleza | moda | tecnologia | hogar | ocio | otros",
      "target_price": 30,
      "notes": "",
      "image": "fotos/abc123.jpg",
      "created_at": "2026-11-06",
      "updated_at": "2026-11-08",
      "done_at": "2026-12-24",
      "klarna_url": "https://www.klarna.com/es/shopping/pl/...",
      "offers": [
        {
          "id": "o1",
          "shop": "Druni",
          "url": "https://...",
          "price": 35.1,
          "checked_at": "2026-11-08",
          "history": [{ "date": "2026-11-08", "price": 35.1 }],
          "source": "klarna"
        }
      ]
    }
  ]
}
```

## Pruebas

```bash
python3 -m unittest discover precios
```

```bash
node pruebas/prueba_pagina.js
```

La prueba de la página usa Playwright y una API de GitHub simulada. No usa la red.
