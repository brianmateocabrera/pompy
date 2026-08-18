import https from 'https';

export default function handler(req, res) {
  // Aseguramos que solo se acepten peticiones POST desde tu panel
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // Debe ser: brianmateocabrera/pompy
  const { path, message, content, sha } = req.body;

  // Creamos y limpiamos la URL completa usando el constructor oficial de Node.js
  const githubUrl = new URL(`https://github.com{repo}/contents/${path}`);

  const bodyData = JSON.stringify({
    message: message || "Actualizado desde el panel de administración",
    content: Buffer.from(content).toString('base64'), 
    sha: sha || undefined
  });

  const options = {
    hostname: githubUrl.hostname,
    path: githubUrl.pathname,
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

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      // Si la respuesta no es un JSON válido (por ejemplo, un error 404 plano)
      let parsedData = {};
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        parsedData = { message: data };
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return res.status(200).json({ success: true, data: parsedData });
      } else {
        return res.status(response.statusCode).json({ 
          success: false, 
          error: parsedData.message || `Error ${response.statusCode} en GitHub` 
        });
      }
    });
  });

  request.on('error', (error) => {
    return res.status(500).json({ success: false, error: 'Error de red en el servidor: ' + error.message });
  });

  request.write(bodyData);
  request.end();
}
