import https from 'https';
import crypto from 'crypto';


const COOKIE_NAME = 'admin_session';

const SESSION_DURATION =
    8 * 60 * 60 * 1000; // 8 horas

const SESSION_SECRET =
    process.env.SESSION_SECRET;


// =================================================
// LÍMITES DE IMÁGENES
// =================================================

const IMAGEN_MAX_BYTES =
    4.5 * 1024 * 1024;

const IMAGEN_MAX_BASE64_LENGTH =
    Math.ceil(
        IMAGEN_MAX_BYTES * 4 / 3
    ) + 4;


// =================================================
// HANDLER
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


        if (!SESSION_SECRET) {

            return res.status(500).json({
                success: false,
                error:
                    'Falta la variable SESSION_SECRET'
            });
        }


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
                [
                    `${COOKIE_NAME}=`,
                    'Path=/',
                    'HttpOnly',
                    'Secure',
                    'SameSite=Strict',
                    'Max-Age=0'
                ].join('; ')
            );


            return res.status(200).json({
                success: true
            });
        }


        // =========================================
        // VALIDAR RUTA
        // =========================================

        if (
            typeof path !== 'string' ||
            !path
        ) {

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
            esRutaImagenPermitida(path);


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

            const validacion =
                validarImagenBase64(
                    content
                );


            if (!validacion.valida) {

                return res.status(400).json({
                    success: false,
                    error:
                        validacion.error
                });
            }


            contenidoFinal =
                content;

        } else {

            /*
             * productos.json llega como texto.
             */

            if (
                typeof content !== 'string'
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        'El contenido del archivo no es válido.'
                });
            }


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
                            // CONFLICTO
                            // =================================

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


                            // =================================
                            // AUTORIZACIÓN GITHUB
                            // =================================

                            if (
                                response.statusCode === 401 ||
                                response.statusCode === 403
                            ) {

                                console.error(
                                    'GitHub rechazó la operación:',
                                    response.statusCode,
                                    parsedData.message
                                );

                                return res.status(502).json({

                                    success:
                                        false,

                                    error:
                                        'GitHub rechazó la operación de escritura.'
                                });
                            }


                            // =================================
                            // ARCHIVO NO ENCONTRADO
                            // =================================

                            if (
                                response.statusCode === 404
                            ) {

                                return res.status(502).json({

                                    success:
                                        false,

                                    error:
                                        'El archivo o repositorio indicado no existe en GitHub.'
                                });
                            }


                            // =================================
                            // ERROR GITHUB
                            // =================================

                            console.error(
                                'Error GitHub:',
                                response.statusCode,
                                parsedData.message
                            );


                            return res.status(502).json({

                                success:
                                    false,

                                error:
                                    'GitHub no pudo completar la operación.'
                            });
                        }
                    );
                }
            );


        request.on(
            'error',
            error => {

                console.error(
                    'Error de conexión con GitHub:',
                    error
                );


                return res.status(502).json({

                    success:
                        false,

                    error:
                        'No se pudo conectar con GitHub.'
                });
            }
        );


        request.write(
            bodyData
        );

        request.end();


    } catch (error) {

        console.error(
            'Error interno:',
            error
        );


        return res.status(500).json({

            success:
                false,

            error:
                'Error interno del servidor.'
        });
    }
}


// =================================================
// VALIDAR RUTA DE IMAGEN
// =================================================

function esRutaImagenPermitida(
    path
) {

    return (
        typeof path === 'string' &&
        /^public\/imagenes\/[a-zA-Z0-9_-]+\.webp$/i
            .test(path)
    );
}


// =================================================
// VALIDAR IMAGEN BASE64
// =================================================

function validarImagenBase64(
    content
) {

    if (
        typeof content !== 'string'
    ) {

        return {
            valida: false,
            error:
                'El contenido de la imagen no es válido.'
        };
    }


    if (
        content.length === 0
    ) {

        return {
            valida: false,
            error:
                'La imagen está vacía.'
        };
    }


    if (
        content.length >
        IMAGEN_MAX_BASE64_LENGTH
    ) {

        return {
            valida: false,
            error:
                'La imagen supera el tamaño máximo permitido de 4.5 MB.'
        };
    }


    /*
     * Solo aceptamos Base64 puro.
     * El frontend elimina previamente
     * el encabezado data:image/webp;base64,
     */

    if (
        !/^[A-Za-z0-9+/]*={0,2}$/.test(
            content
        )
    ) {

        return {
            valida: false,
            error:
                'El contenido de la imagen no es Base64 válido.'
        };
    }


    if (
        content.length % 4 !== 0
    ) {

        return {
            valida: false,
            error:
                'El contenido Base64 de la imagen está incompleto.'
        };
    }


    let buffer;


    try {

        buffer =
            Buffer.from(
                content,
                'base64'
            );

    } catch {

        return {
            valida: false,
            error:
                'No se pudo decodificar la imagen.'
        };
    }


    if (
        !buffer ||
        buffer.length === 0
    ) {

        return {
            valida: false,
            error:
                'La imagen está vacía.'
        };
    }


    if (
        buffer.length >
        IMAGEN_MAX_BYTES
    ) {

        return {
            valida: false,
            error:
                'La imagen supera el tamaño máximo permitido de 4.5 MB.'
        };
    }


    /*
     * Validación real del formato WebP.
     *
     * WebP válido:
     * bytes 0-3  = RIFF
     * bytes 8-11 = WEBP
     */

    if (
        buffer.length < 12
    ) {

        return {
            valida: false,
            error:
                'El archivo no contiene una estructura WebP válida.'
        };
    }


    const riff =
        buffer.toString(
            'ascii',
            0,
            4
        );


    const webp =
        buffer.toString(
            'ascii',
            8,
            12
        );


    if (
        riff !== 'RIFF' ||
        webp !== 'WEBP'
    ) {

        return {
            valida: false,
            error:
                'El archivo no es una imagen WebP válida.'
        };
    }


    return {
        valida: true
    };
}


// =================================================
// COMPARAR CONTRASEÑAS
// =================================================

function compararSecretos(
    recibido,
    esperado
) {

    const recibidoBuffer =
        Buffer.from(
            String(recibido),
            'utf8'
        );


    const esperadoBuffer =
        Buffer.from(
            String(esperado),
            'utf8'
        );


    if (
        recibidoBuffer.length !==
        esperadoBuffer.length
    ) {

        return false;
    }


    return crypto.timingSafeEqual(
        recibidoBuffer,
        esperadoBuffer
    );
}


// =================================================
// CREAR SESIÓN
// =================================================

function crearSesion() {

    const expiracion =
        Date.now() +
        SESSION_DURATION;


    const random =
        crypto
            .randomBytes(32)
            .toString('hex');


    const datos =
        `${expiracion}.${random}`;


    const firma =
        crypto
            .createHmac(
                'sha256',
                SESSION_SECRET
            )
            .update(datos)
            .digest('hex');


    return (
        `${datos}.${firma}`
    );
}


// =================================================
// CREAR COOKIE
// =================================================

function construirCookie(
    session
) {

    return [

        `${COOKIE_NAME}=${session}`,

        'Path=/',

        'HttpOnly',

        'Secure',

        'SameSite=Strict',

        `Max-Age=${Math.floor(
            SESSION_DURATION / 1000
        )}`

    ].join('; ');
}


// =================================================
// OBTENER COOKIES
// =================================================

function obtenerCookies(
    req
) {

    const cookies = {};


    const header =
        req.headers.cookie ||
        '';


    header
        .split(';')
        .forEach(
            parte => {

                const indice =
                    parte.indexOf('=');


                if (
                    indice === -1
                ) {
                    return;
                }


                const nombre =
                    parte
                        .slice(
                            0,
                            indice
                        )
                        .trim();


                const valor =
                    parte
                        .slice(
                            indice + 1
                        )
                        .trim();


                cookies[nombre] =
                    valor;
            }
        );


    return cookies;
}


// =================================================
// VALIDAR SESIÓN
// =================================================

function sesionValida(
    req
) {

    const cookies =
        obtenerCookies(
            req
        );


    const session =
        cookies[
            COOKIE_NAME
        ];


    if (!session) {
        return false;
    }


    const partes =
        session.split('.');


    if (
        partes.length !== 3
    ) {
        return false;
    }


    const [
        expiracionTexto,
        random,
        firma
    ] = partes;


    const expiracion =
        Number(
            expiracionTexto
        );


    if (
        !Number.isFinite(
            expiracion
        ) ||
        expiracion <= Date.now()
    ) {

        return false;
    }


    if (
        !/^[a-f0-9]{64}$/i.test(
            random
        ) ||
        !/^[a-f0-9]{64}$/i.test(
            firma
        )
    ) {

        return false;
    }


    const datos =
        `${expiracion}.${random}`;


    const firmaEsperada =
        crypto
            .createHmac(
                'sha256',
                SESSION_SECRET
            )
            .update(datos)
            .digest('hex');


    const firmaRecibidaBuffer =
        Buffer.from(
            firma,
            'hex'
        );


    const firmaEsperadaBuffer =
        Buffer.from(
            firmaEsperada,
            'hex'
        );


    if (
        firmaRecibidaBuffer.length !==
        firmaEsperadaBuffer.length
    ) {

        return false;
    }


    return crypto.timingSafeEqual(
        firmaRecibidaBuffer,
        firmaEsperadaBuffer
    );
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


                                console.error(
                                    'Error GitHub al leer archivo:',
                                    response.statusCode,
                                    errorData.message
                                );


                                return res
                                    .status(
                                        502
                                    )
                                    .json({

                                        success:
                                            false,

                                        error:
                                            'No se pudo obtener el archivo desde GitHub.'
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

                            console.error(
                                'Error procesando respuesta de GitHub:',
                                error
                            );


                            return res.status(500).json({

                                success:
                                    false,

                                error:
                                    'No se pudo procesar la respuesta de GitHub.'
                            });
                        }
                    }
                );
            }
        );


    request.on(
        'error',
        error => {

            console.error(
                'Error de conexión con GitHub:',
                error
            );


            return res.status(502).json({

                success:
                    false,

                error:
                    'No se pudo conectar con GitHub.'
            });
        }
    );


    request.end();
}
