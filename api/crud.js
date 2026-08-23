import https from 'https';
import crypto from 'crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas

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
                !crypto.timingSafeEqual(
                    Buffer.from(password),
                    Buffer.from(adminPassword)
                )
            ) {
                return res.status(401).json({
                    success: false,
                    error: 'Contraseña de administrador incorrecta'
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
        // CERRAR SESIÓN
        // =========================================

        if (action === 'LOGOUT') {

            res.setHeader(
                'Set-Cookie',
                `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
            );


            return res.status(200).json({
                success: true
            });
        }


        // =========================================
        // RUTA
        // =========================================

        if (!path) {
            return res.status(400).json({
                success: false,
                error: 'Ruta de archivo requerida'
            });
        }


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


        // =========================================
        // GET PÚBLICO
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
        // OPERACIONES DE ESCRITURA
        // =========================================

        if (action !== 'PUT') {
            return res.status(400).json({
                success: false,
                error: 'Acción no permitida'
            });
        }


        if (!sesionValida(req)) {

            return res.status(401).json({
                success: false,
                error: 'Sesión de administrador inválida o expirada'
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


// =================================================
// SESIONES
// =================================================

function crearSesion() {

    const expiracion =
        Date.now() +
        SESSION_DURATION;


    const random =
        crypto.randomBytes(32)
            .toString('hex');


    return `${expiracion}.${random}`;
}


function construirCookie(session) {

    return [
        `${COOKIE_NAME}=${session}`,
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        `Max-Age=${Math.floor(SESSION_DURATION / 1000)}`
    ].join('; ');
}


function obtenerCookies(req) {

    const cookies = {};

    const header =
        req.headers.cookie || '';


    header
        .split(';')
        .forEach(parte => {

            const indice =
                parte.indexOf('=');

            if (indice === -1) {
                return;
            }


            const nombre =
                parte
                    .slice(0, indice)
                    .trim();

            const valor =
                parte
                    .slice(indice + 1)
                    .trim();


            cookies[nombre] = valor;
        });


    return cookies;
}


function sesionValida(req) {

    const cookies =
        obtenerCookies(req);


    const session =
        cookies[COOKIE_NAME];


    if (!session) {
        return false;
    }


    const partes =
        session.split('.');


    if (partes.length !== 2) {
        return false;
    }


    const expiracion =
        Number(partes[0]);


    if (
        !Number.isFinite(expiracion) ||
        expiracion < Date.now()
    ) {
        return false;
    }


    if (
        !/^[a-f0-9]{64}$/i.test(
            partes[1]
        )
    ) {
        return false;
    }


    return true;
}


// =================================================
// GITHUB GET
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
