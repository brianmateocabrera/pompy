import https from 'https';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  const { path, message, content, sha, action } = req.body;

  if (!token || !repo) {
    return res.status(500).json({ success: false, error: 'Faltan variables de entorno de GitHub' });
  }

  if (!path) {
    return res.status(400).json({ success: false, error: 'Ruta de archivo requerida' });
  }

  const exactPath = '/repos/' + repo + '/contents/' + path;

  // CASO 1: LEER ARCHIVO
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

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode === 404) {
          return res.status(200).json({
            success: false,
            status: 404,
            message: 'Archivo no existe'
          });
        }

        try {
          const fileData = JSON.parse(data);

          const jsonPlano = JSON.parse(
            Buffer.from(fileData.content, 'base64').toString('utf-8')
          );

          return res.status(200).json({
            success: true,
            sha: fileData.sha,
            data: jsonPlano
          });

        } catch (e) {
          return res.status(500).json({
            success: false,
            error: 'Error procesando los datos de GitHub'
          });
        }
      });
    });

    request.on('error', (e) => {
      return res.status(500).json({
        success: false,
        error: e.message
      });
    });

    request.end();
    return;
  }

  // CASO 2: GUARDAR ARCHIVO
  let contenidoFinal;

  // Las imágenes ya llegan en Base64 desde el navegador.
  // Los archivos de texto (JSON) necesitan conversión.
  if (path.startsWith('public/imagenes/')) {
    contenidoFinal = content;
  } else {
    contenidoFinal = Buffer.from(content).toString('base64');
  }

  const bodyData = JSON.stringify({
    message: message || "Actualizado desde el panel",
    content: contenidoFinal,
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

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      let parsedData = {};

      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        parsedData = { message: data };
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return res.status(200).json({
          success: true,
          sha: parsedData.content.sha
        });
      }

      return res.status(response.statusCode).json({
        success: false,
        error: parsedData.message || 'Error en GitHub'
      });
    });
  });

  request.on('error', (error) => {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  });

  request.write(bodyData);
  request.end();
}