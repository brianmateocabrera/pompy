import crypto from 'crypto';

import {
    obtenerArchivo,
    actualizarArchivo
} from './lib/github.js';


const COOKIE_NAME = 'admin_session';

const SESSION_DURATION =
    8 * 60 * 60 * 1000; // 8 horas


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
        // ACTUALIZAR GITHUB
        // =========================================

        return actualizarArchivo(
            path,
            token,
            repo,
            message,
            contenidoFinal,
            sha,
            res
        );


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


    return (
        `${expiracion}.${random}`
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
        partes.length !== 2
    ) {
        return false;
    }


    const expiracion =
        Number(
            partes[0]
        );


    if (
        !Number.isFinite(
            expiracion
        ) ||
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
