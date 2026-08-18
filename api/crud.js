import https from 'https';

export default function handler(req, res) {
  // Aseguramos que solo se acepten peticiones POST desde tu web
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; 
  const { path, message, content, sha } = req.body;

  // Preparamos los datos tal como los pide GitHub
  const bodyData = JSON.stringify({
    message: message || "Actualizado desde el panel de administración",
    content: Buffer.from(content).toString('base64'), 
    sha: sha || undefined
  });

  // Configuración de la petición HTTP segura hacia la API de GitHub
  const options = {
    hostname: '://github.com',
    path: `/repos/${repo}/contents/${path}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Vercel-Serverless-Function', // GitHub exige estrictamente un User-Agent
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Length': Buffer.byteLength(bodyData)
    }
  };

  // Ejecutamos la llamada
  const request = https.request(options, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      const parsedData = JSON.parse(data);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return res.status(200).json({ success: true, data: parsedData });
      } else {
        return res.status(response.statusCode).json({ 
          success: false, 
          error: parsedData.message || 'Error en la API de GitHub' 
        });
      }
    });
  });

  request.on('error', (error) => {
    return res.status(500).json({ success: false, error: 'Error de red en el servidor: ' + error.message });
  });

  // Enviamos los datos y cerramos la conexión
  request.write(bodyData);
  request.end();
}
