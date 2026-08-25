import https from 'https';


// =================================================
// CONFIGURACIÓN
// =================================================

const GITHUB_API_HOST =
    'api.github.com';

const GITHUB_USER_AGENT =
    'Vercel-Serverless-Function';

const GITHUB_API_VERSION =
    '2022-11-28';


// =================================================
// OBTENER ARCHIVO DESDE GITHUB
// =================================================

export function obtenerArchivo(
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
            GITHUB_API_HOST,

        path:
            exactPath,

        method:
            'GET',

        headers: {

            'Authorization':
                'Bearer ' + token,

            'User-Agent':
                GITHUB_USER_AGENT,

            'Accept':
                'application/vnd.github+json',

            'X-GitHub-Api-Version':
                GITHUB_API_VERSION
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


// =================================================
// ACTUALIZAR ARCHIVO EN GITHUB
// =================================================

export function actualizarArchivo(
    path,
    token,
    repo,
    message,
    contenidoFinal,
    sha,
    res
) {

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

        hostname:
            GITHUB_API_HOST,

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
                GITHUB_USER_AGENT,

            'Accept':
                'application/vnd.github+json',

            'X-GitHub-Api-Version':
                GITHUB_API_VERSION,

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


                        // =============================
                        // ÉXITO
                        // =============================

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


                        // =============================
                        // CONFLICTO
                        // =============================

                        if (
                            response.statusCode === 409
                        ) {

                            return res.status(409).json({

                                success:
                                    false,

                                conflict:
                                    true,

                                error:
                                    'El archivo fue modificado desde otro dispositivo.'

                            });
                        }


                        // =============================
                        // ERROR
                        // =============================

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
}
