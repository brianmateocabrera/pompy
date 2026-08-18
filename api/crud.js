export default async function handler(req, res) {
  // Aseguramos que solo se acepten peticiones POST desde tu web
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  // Vercel inyectará automáticamente aquí el token y el repo que guardamos antes
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; 
  
  // Recibimos los datos que envías desde el formulario HTML
  const { path, message, content, sha } = req.body;

  try {
    // Conectamos con la API oficial de GitHub usando tu token de grano fino
    const response = await fetch(`https://github.com{repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        message: message || "Actualizado desde el panel de administración",
        // GitHub exige estrictamente que el contenido del archivo esté en formato Base64
        content: Buffer.from(content).toString('base64'), 
        sha: sha || undefined // Solo se usa si estamos editando un archivo que ya existe
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al conectar con la API de GitHub');
    }

    // Si todo sale bien, respondemos éxito al navegador
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
