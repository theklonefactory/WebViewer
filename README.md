# klone-viewer.js

A drop-in 3D Gaussian splat viewer for the web, built on [Three.js](https://threejs.org/) and [Spark](https://sparkjs.dev/).  
Provided by [The Klone Factory](https://theklonefactory.com) as part of a 3D object integration package.

---

## What it does

- Renders a `.ksplat` or `.ply` Gaussian splat file inside any `<div>` on your page
- Auto-rotates the object; pauses when the user interacts, resumes shortly after
- Full orbit controls — drag to rotate, scroll to zoom
- Shows a loading indicator while the asset downloads
- Responds to container resize automatically
- No build step, no bundler, no dependencies to install — pure ES modules loaded from CDN

---

## Requirements

A browser with ES module and WebGL 2 support. This covers all modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge).

---

## Quick start

### 1. Add the importmap

Paste this into your `<head>`, before any `<script type="module">` tags:

```html
<script type="importmap">
{
  "imports": {
    "three":             "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.js",
    "three/addons/":     "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
    "@sparkjsdev/spark": "https://sparkjs.dev/releases/spark/2.0.0/spark.module.js"
  }
}
</script>
```

### 2. Add a container div

Give it an explicit size — the viewer fills it completely:

```html
<div id="my-viewer" style="width: 100%; height: 600px;"></div>
```

### 3. Call `add3DViewer`

```html
<script type="module">
  import { add3DViewer } from './klone-viewer.js';

  add3DViewer(
    'my-viewer',              // id of the container div
    'assets/my-object.ksplat' // path or URL to the .ksplat file
  );
</script>
```

That's it.

---

## API

```js
add3DViewer(containerId, splatUrl, cameraPosition?, lookAt?)
```

| Parameter        | Type               | Default          | Description                              |
|------------------|--------------------|------------------|------------------------------------------|
| `containerId`    | `string`           | —                | `id` of the host `<div>`                 |
| `splatUrl`       | `string`           | —                | URL or path to the `.ksplat` file        |
| `cameraPosition` | `[x, y, z]`       | `[0, -30, -75]`  | Initial camera position                  |
| `lookAt`         | `[x, y, z]`       | `[0, -30, 0]`    | Point the camera orbits around           |

Returns a **`Promise`** that resolves to a **`dispose()`** function once the splat has finished loading.

```js
const dispose = await add3DViewer('my-viewer', 'assets/my-object.ksplat');

// Later, to remove the viewer and free all GPU resources:
dispose();
```

---

## Examples

### Basic embed

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <script type="importmap">
  {
    "imports": {
      "three":             "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.js",
      "three/addons/":     "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
      "@sparkjsdev/spark": "https://sparkjs.dev/releases/spark/2.0.0/spark.module.js"
    }
  }
  </script>

  <style>
    #viewer { width: 100%; height: 600px; background: #000; }
  </style>
</head>
<body>

  <div id="viewer"></div>

  <script type="module">
    import { add3DViewer } from './klone-viewer.js';
    add3DViewer('viewer', 'assets/my-object.ksplat');
  </script>

</body>
</html>
```

## Notes

- **The importmap must come before any `<script type="module">` tags** in your HTML. Most page templates will have no importmap at all, so you're just adding one.
- **One importmap per page.** If your page already uses an importmap, merge the three entries into it rather than adding a second one.
- **CORS.** If you're loading `.ksplat` files from a different domain or a CDN, ensure that server sends `Access-Control-Allow-Origin: *` headers.
- **File size.** `.ksplat` files are typically 20–150 MB. Host them on a CDN or object storage (Cloudflare R2, AWS S3, etc.) rather than your web server for best load performance.

---

## Support

Provided by **The Klone Factory — Wilmot Software Ltd**, Westcliff-on-Sea, Essex.  
For integration questions: [pierre.wilmot@gmail.com](mailto:pierre.wilmot@gmail.com)
