import https from 'https';

import {
    compararSecretos,
    crearSesion,
    construirCookie,
    construirCookieLogout,
    sesionValida
} from './auth.js';


// =================================================
// HANDLER PRINCIPAL
// =================================================

export default function handler(req, res) {

    try {

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        );

        res.setHeader(
            'Pragma',
            'no-cache'
        );

        res.setHeader(
            'Expires',
            '0'
        );


        // =========================================
        // MÉTODO HTTP
        // =========================================

        if (req.method !== 'POST') {

            return res.status(405).json({
                success: false,
                error: 'Método no permitido'
            });
        }


        // =========================================
        // VARIABLES DE ENTORNO
        // =========================================

        const token =
            process.env.GITHUB_TOKEN;

        const repo =
            process.env.GITHUB_REPO;

        const adminPassword =
            process.env.ADMIN_PASSWORD;


        if (!token || !repo) {

            return res.status(500).json({
                success: false,
                error:
                    'Faltan variables de entorno de GitHub'
            });
        }


        if (!adminPassword) {

            return res.status(500).json({
                success: false,
                error:
                    'Falta la variable ADMIN_PASSWORD'
            });
        }


        // =========================================
        // BODY
        // =========================================

        const {
            path,
            message,
            content,
            sha,
            action,
            password
        } = req.body || {};


        // =========================================
        // AUTENTICACIÓN
        // =========================================

        if (action === 'AUTH') {

            if (
                typeof password !== 'string' ||
                !compararSecretos(
                    password,
                    adminPassword
                )
            ) {

                return res.status(401).json({
                    success: false,
                    error:
                        'Contraseña de administrador incorrecta'
                });
            }


            const session =
                crearSesion();


            res.setHeader(
                'Set-Cookie',
                construirCookie(session)
            );


            return res.status(200).json({
                success: true
            });
        }


        // =========================================
        // COMPROBAR SESIÓN
        // =========================================

        if (action === 'SESSION') {

            if (!sesionValida(req)) {

                return res.status(401).json({
                    success: false,
                    error:
                        'Sesión inválida o expirada'
                });
            }


            return res.status(200).json({
                success: true
            });
        }


        // =========================================
        // CERRAR SESIÓN
        // =========================================

        if (action === 'LOGOUT') {

            res.setHeader(
                'Set-Cookie',
                construirCookieLogout()
            );


            return res.status(200).json({
                success: true
            });
        }


        // =========================================
        // VALIDAR RUTA
        // =========================================

        if (!path) {

            return res.status(400).json({
                success: false,
                error:
                    'Ruta de archivo requerida'
            });
        }


        // =========================================
        // RUTAS PERMITIDAS
        // =========================================

        const rutasPermitidas = [
            'data/productos.json'
        ];


        const esImagenPermitida =
            typeof path === 'string' &&
            path.startsWith(
                'public/imagenes/'
            );


        if (
            !rutasPermitidas.includes(path) &&
            !esImagenPermitida
        ) {

            return res.status(403).json({
                success: false,
                error:
                    'Ruta no autorizada'
            });
        }


        // =========================================
        // GET
        // =========================================
        //
        // El catálogo público puede leer
        // productos.json sin autenticación.
        //
        // Las imágenes son archivos públicos
        // servidos directamente por Vercel.
        // =========================================

        if (action === 'GET') {

            return obtenerArchivo(
                path,
                token,
                repo,
                res
            );
        }


        // =========================================
        // ESCRITURA
        // =========================================

        if (action !== 'PUT') {

            return res.status(400).json({
                success: false,
                error:
                    'Acción no permitida'
            });
        }


        // =========================================
        // VALIDAR SESIÓN
        // =========================================

        if (!sesionValida(req)) {

            return res.status(401).json({
                success: false,
                error:
                    'Sesión de administrador inválida o expirada'
            });
        }


        // =========================================
        // VALIDAR CONTENIDO
        // =========================================

        if (
            content === undefined ||
            content === null ||
            content === ''
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'Contenido requerido'
            });
        }


        // =========================================
        // PREPARAR CONTENIDO
        // =========================================

        let contenidoFinal;


        if (esImagenPermitida) {

            /*
             * Las imágenes llegan como Base64
             * puro desde imageOptimizer.js.
             */

            contenidoFinal =
                content;

        } else {

            /*
             * productos.json llega como texto.
             */

            contenidoFinal =
                Buffer
                    .from(
                        content,
                        'utf8'
                    )
                    .toString('base64');
        }


        // =========================================
        // DATOS PARA GITHUB
        // =========================================

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


        // =========================================
        // REQUEST GITHUB
        // =========================================

        const options = {

            hostname:
                'api.github.com',

            path:
                exactPath,

            method:
                'PUT',

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
                    Buffer.byteLength(
                        bodyData
                    )
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
                                    JSON.parse(
                                        data
                                    );

                            } catch {

                                parsedData = {
                                    message:
                                        data
                                };
                            }


                            // =================================
                            // ÉXITO
                            // =================================

                            if (
                                response.statusCode >= 200 &&
                                response.statusCode < 300
                            ) {

                                return res.status(200).json({

                                    success:
                                        true,

                                    sha:
                                        parsedData
                                            .content
                                            ?.sha

                                });
                            }


                            // =================================
                            // ERROR GITHUB
                            // =================================

                            if (
                                response.statusCode === 409
                            ) {

                                return res.status(409).json({

                                    success: false,

                                    conflict: true,

                                    error:
                                        'El archivo fue modificado desde otro dispositivo.'

                                });
                            }


                            return res
                                .status(
                                    response.statusCode
                                )
                                .json({

                                    success:
                                        false,

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

                    success:
                        false,

                    error:
                        error.message

                });
            }
        );


        request.write(
            bodyData
        );

        request.end();


    } catch (error) {

        return res.status(500).json({

            success:
                false,

            error:
                error.message

        });
    }
}


// =================================================
// OBTENER ARCHIVO DESDE GITHUB
// =================================================

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

        hostname:
            'api.github.com',

        path:
            exactPath,

        method:
            'GET',

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

                            // =============================
                            // NO EXISTE
                            // =============================

                            if (
                                response.statusCode ===
                                404
                            ) {

                                return res.status(200).json({

                                    success:
                                        false,

                                    status:
                                        404,

                                    message:
                                        'Archivo no existe'

                                });
                            }


                            // =============================
                            // ERROR GITHUB
                            // =============================

                            if (
                                response.statusCode < 200 ||
                                response.statusCode >= 300
                            ) {

                                let errorData;


                                try {

                                    errorData =
                                        JSON.parse(
                                            data
                                        );

                                } catch {

                                    errorData = {};
                                }


                                return res
                                    .status(
                                        response.statusCode
                                    )
                                    .json({

                                        success:
                                            false,

                                        error:
                                            errorData.message ||
                                            'Error en GitHub'

                                    });
                            }


                            // =============================
                            // DECODIFICAR
                            // =============================

                            const fileData =
                                JSON.parse(
                                    data
                                );


                            const contenido =
                                Buffer
                                    .from(
                                        fileData.content,
                                        'base64'
                                    )
                                    .toString(
                                        'utf8'
                                    );


                            const jsonPlano =
                                JSON.parse(
                                    contenido
                                );


                            return res.status(200).json({

                                success:
                                    true,

                                sha:
                                    fileData.sha,

                                data:
                                    jsonPlano

                            });


                        } catch (error) {

                            return res.status(500).json({

                                success:
                                    false,

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

                success:
                    false,

                error:
                    error.message

            });
        }
    );


    request.end();
}
