import https from 'https';

export default function handler(req, res) {

    try {

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        );

        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');


        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: 'Método no permitido'
            });
        }


        const token =
            process.env.GITHUB_TOKEN;

        const repo =
            process.env.GITHUB_REPO;

        const adminPassword =
            process.env.ADMIN_PASSWORD;


        const {
            path,
            message,
            content,
            sha,
            action,
            password
        } = req.body || {};


        if (!token || !repo) {
            return res.status(500).json({
                success: false,
                error: 'Faltan variables de entorno de GitHub'
            });
        }


        if (!adminPassword) {
            return res.status(500).json({
                success: false,
                error: 'Falta la variable ADMIN_PASSWORD'
            });
        }


        if (!path) {
            return res.status(400).json({
                success: false,
                error: 'Ruta de archivo requerida'
            });
        }


        // -----------------------------------------
        // RUTAS PERMITIDAS
        // -----------------------------------------

        const rutasPermitidas = [
            'data/productos.json'
        ];

        const esImagenPermitida =
            typeof path === 'string' &&
            path.startsWith('public/imagenes/');


        if (
            !rutasPermitidas.includes(path) &&
            !esImagenPermitida
        ) {
            return res.status(403).json({
                success: false,
                error: 'Ruta no autorizada'
            });
        }


        // -----------------------------------------
        // LECTURA PÚBLICA
        // -----------------------------------------

        if (action === 'GET') {

            return obtenerArchivo(
                path,
                token,
                repo,
                res
            );
        }


        // -----------------------------------------
        // ESCRITURA PROTEGIDA
        // -----------------------------------------

        if (password !== adminPassword) {
            return res.status(401).json({
                success: false,
                error: 'Contraseña de administrador incorrecta'
            });
        }


        if (action !== 'PUT') {
            return res.status(400).json({
                success: false,
                error: 'Acción no permitida'
            });
        }


        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Contenido requerido'
            });
        }


        let contenidoFinal;


        if (esImagenPermitida) {

            contenidoFinal = content;

        } else {

            contenidoFinal =
                Buffer
                    .from(content)
                    .toString('base64');
        }


        const bodyData =
            JSON.stringify({

                message:
                    message ||
                    'Actualizado desde el panel',

                content:
                    contenidoFinal,

                ...(sha
                    ? { sha }
                    : {})

            });


        const exactPath =
            '/repos/' +
            repo +
            '/contents/' +
            path;


        const options = {

            hostname: 'api.github.com',

            path: exactPath,

            method: 'PUT',

            headers: {

                'Authorization':
                    'Bearer ' + token,

                'Content-Type':
                    'application/json',

                'User-Agent':
                    'Vercel-Serverless-Function',

                'Accept':
                    'application/vnd.github+json',

                'X-GitHub-Api-Version':
                    '2022-11-28',

                'Content-Length':
                    Buffer.byteLength(bodyData)

            }

        };


        const request =
            https.request(
                options,
                response => {

                    let data = '';


                    response.on(
                        'data',
                        chunk => {
                            data += chunk;
                        }
                    );


                    response.on(
                        'end',
                        () => {

                            let parsedData = {};


                            try {

                                parsedData =
                                    JSON.parse(data);

                            } catch {

                                parsedData = {
                                    message: data
                                };
                            }


                            if (
                                response.statusCode >= 200 &&
                                response.statusCode < 300
                            ) {

                                return res.status(200).json({
                                    success: true,
                                    sha:
                                        parsedData
                                            .content
                                            ?.sha
                                });
                            }


                            return res
                                .status(
                                    response.statusCode
                                )
                                .json({

                                    success: false,

                                    error:
                                        parsedData.message ||
                                        'Error en GitHub'

                                });

                        }
                    );
                }
            );


        request.on(
            'error',
            error => {

                return res.status(500).json({
                    success: false,
                    error: error.message
                });

            }
        );


        request.write(bodyData);
        request.end();


    } catch (error) {

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}


// ================================================
// OBTENER ARCHIVO DESDE GITHUB
// ================================================

function obtenerArchivo(
    path,
    token,
    repo,
    res
) {

    const exactPath =
        '/repos/' +
        repo +
        '/contents/' +
        path;


    const options = {

        hostname: 'api.github.com',

        path: exactPath,

        method: 'GET',

        headers: {

            'Authorization':
                'Bearer ' + token,

            'User-Agent':
                'Vercel-Serverless-Function',

            'Accept':
                'application/vnd.github+json',

            'X-GitHub-Api-Version':
                '2022-11-28'

        }
    };


    const request =
        https.request(
            options,
            response => {

                let data = '';


                response.on(
                    'data',
                    chunk => {
                        data += chunk;
                    }
                );


                response.on(
                    'end',
                    () => {

                        try {

                            if (
                                response.statusCode === 404
                            ) {

                                return res.status(200).json({
                                    success: false,
                                    status: 404,
                                    message:
                                        'Archivo no existe'
                                });
                            }


                            if (
                                response.statusCode < 200 ||
                                response.statusCode >= 300
                            ) {

                                const error =
                                    JSON.parse(data);

                                return res
                                    .status(
                                        response.statusCode
                                    )
                                    .json({

                                        success: false,

                                        error:
                                            error.message ||
                                            'Error en GitHub'

                                    });
                            }


                            const fileData =
                                JSON.parse(data);


                            const contenido =
                                Buffer
                                    .from(
                                        fileData.content,
                                        'base64'
                                    )
                                    .toString('utf-8');


                            const jsonPlano =
                                JSON.parse(
                                    contenido
                                );


                            return res.status(200).json({

                                success: true,

                                sha:
                                    fileData.sha,

                                data:
                                    jsonPlano

                            });


                        } catch (error) {

                            return res.status(500).json({

                                success: false,

                                error:
                                    error.message

                            });
                        }
                    }
                );
            }
        );


    request.on(
        'error',
        error => {

            return res.status(500).json({

                success: false,

                error: error.message

            });

        }
    );


    request.end();
}
