/*import https from 'https';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; 
  const { path, message, content, sha, action } = req.body;

  const exactPath = '/repos/' + repo + '/contents/' + path;

  // CASO 1: LEER EL INVENTARIO (GET)
  if (action === 'GET') {
    const options = {
      hostname: 'api.github.com',
      path: exactPath,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'Vercel-Serverless-Function',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode === 404) {
          return res.status(200).json({ success: false, status: 404, message: 'Archivo no existe' });
        }
        try {
          const fileData = JSON.parse(data);
          // Decodificamos el Base64 que manda GitHub a texto legible
          const jsonPlano = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
          return res.status(200).json({ success: true, sha: fileData.sha, data: jsonPlano });
        } catch (e) {
          return res.status(500).json({ success: false, error: 'Error procesando los datos de GitHub' });
        }
      });
    });
    request.on('error', (e) => res.status(500).json({ success: false, error: e.message }));
    request.end();
    return;
  }

  // CASO 2: GUARDAR EL INVENTARIO (PUT)
  const bodyData = JSON.stringify({
    message: message || "Actualizado desde el panel",
    content: Buffer.from(content).toString('base64'), 
    sha: sha || undefined
  });

  const options = {
    hostname: 'api.github.com',
    path: exactPath,
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'User-Agent': 'Vercel-Serverless-Function', 
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Length': Buffer.byteLength(bodyData)
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      let parsedData = {};
      try { parsedData = JSON.parse(data); } catch (e) { parsedData = { message: data }; }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return res.status(200).json({ success: true, sha: parsedData.content.sha });
      } else {
        return res.status(response.statusCode).json({ success: false, error: parsedData.message || 'Error en GitHub' });
      }
    });
  });

  request.on('error', (error) => res.status(500).json({ success: false, error: error.message }));
  request.write(bodyData);
  request.end();
}*/
import https from 'https';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return res.status(500).json({ success: false, error: 'Configuración de servidor incompleta (Tokens faltantes).' });
  }

  const { path, message, content, sha, action } = req.body;

  // Validación de seguridad: Restringir modificación solo a carpetas permitidas
  const allowedPaths = ['administradora/data.json', 'data.json', 'imagenes/'];
  const isPathAllowed = allowedPaths.some(allowed => path && path.startsWith(allowed));

  if (!isPathAllowed) {
    return res.status(403).json({ success: false, error: 'Acceso denegado a la ruta especificada.' });
  }

  const exactPath = `/repos/${repo}/contents/${path}`;

  // LECTURA (GET encapsulado en POST)
  if (action === 'GET' || action === 'read') {
    const options = {
      hostname: 'api.github.com',
      path: exactPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Vercel-Serverless-Function',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode === 404) {
          return res.status(404).json({ success: false, status: 404, message: 'Archivo no encontrado' });
        }
        try {
          const fileData = JSON.parse(data);
          const jsonPlano = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
          return res.status(200).json({ success: true, sha: fileData.sha, data: jsonPlano });
        } catch (e) {
          return res.status(500).json({ success: false, error: 'Error procesando los datos de GitHub' });
        }
      });
    });

    request.on('error', (e) => res.status(500).json({ success: false, error: e.message }));
    request.end();
    return;
  }

  // ESCRITURA / ACTUALIZACIÓN (PUT)
  if (action === 'PUT' || action === 'write') {
    // Si el contenido ya viene en Base64 puro desde el frontend (imágenes/archivos), se usa directo.
    // Si viene como string normal (JSON sin codificar), se convierte a Base64.
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(content.replace(/\s/g, ''));
    const base64Content = isBase64 ? content : Buffer.from(content).toString('base64');

    const payload = {
      message: message || "Actualizado desde el panel de administración",
      content: base64Content
    };

    if (sha) payload.sha = sha;

    const bodyData = JSON.stringify(payload);

    const options = {
      hostname: 'api.github.com',
      path: exactPath,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Serverless-Function',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Length': Buffer.byteLength(bodyData)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        let parsedData = {};
        try { parsedData = JSON.parse(data); } catch (e) { parsedData = { message: data }; }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return res.status(200).json({ success: true, sha: parsedData.content.sha });
        } else if (response.statusCode === 409) {
          return res.status(409).json({ success: false, error: 'Conflicto de versión (SHA). El archivo fue modificado por otro usuario.' });
        } else {
          return res.status(response.statusCode).json({ success: false, error: parsedData.message || 'Error al comunicarse con GitHub' });
        }
      });
    });

    request.on('error', (error) => res.status(500).json({ success: false, error: error.message }));
    request.write(bodyData);
    request.end();
    return;
  }

  return res.status(400).json({ success: false, message: 'Acción no válida' });
}

