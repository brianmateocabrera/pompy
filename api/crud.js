import {
    obtenerArchivo,
    actualizarArchivo
} from './lib/github.js';

import {
    compararSecretos,
    crearSesion,
    construirCookie,
    construirCookieLogout,
    sesionValida
} from './lib/auth.js';


const COOKIE_NAME = 'admin_session';


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
            'data/productos.json',
            'data/banners.json'
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

            contenidoFinal =
                content;

        } else {

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
