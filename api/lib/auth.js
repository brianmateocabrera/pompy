import crypto from 'crypto';


const COOKIE_NAME = 'admin_session';

const SESSION_DURATION =
    8 * 60 * 60 * 1000; // 8 horas

const SESSION_SECRET =
    process.env.ADMIN_SESSION_SECRET;

if (!SESSION_SECRET) {
    throw new Error(
        'Falta configurar ADMIN_SESSION_SECRET'
    );
}


// =================================================
// COMPARAR CONTRASEÑAS
// =================================================

export function compararSecretos(
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

export function crearSesion() {

    const expiracion =
        Date.now() +
        SESSION_DURATION;

    const random =
        crypto
            .randomBytes(32)
            .toString('hex');

    const payload =
        `${expiracion}.${random}`;

    const firma =
        crypto
            .createHmac(
                'sha256',
                SESSION_SECRET
            )
            .update(payload)
            .digest('hex');

    return `${payload}.${firma}`;
}


// =================================================
// CREAR COOKIE
// =================================================

export function construirCookie(
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
// CREAR COOKIE DE LOGOUT
// =================================================

export function construirCookieLogout() {

    return [

        `${COOKIE_NAME}=`,

        'Path=/',

        'HttpOnly',

        'Secure',

        'SameSite=Strict',

        'Max-Age=0'

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

export function sesionValida(
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

    const random =
        partes[1];

    const firma =
        partes[2];

    if (
        !/^[a-f0-9]{64}$/i.test(
            random
        )
    ) {
        return false;
    }

    if (
        !/^[a-f0-9]{64}$/i.test(
            firma
        )
    ) {
        return false;
    }

    const payload =
        `${expiracion}.${random}`;

    const firmaEsperada =
        crypto
            .createHmac(
                'sha256',
                SESSION_SECRET
            )
            .update(payload)
            .digest('hex');

    const firmaBuffer =
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
        firmaBuffer.length !==
        firmaEsperadaBuffer.length
    ) {
        return false;
    }

    if (
        !crypto.timingSafeEqual(
            firmaBuffer,
            firmaEsperadaBuffer
        )
    ) {
        return false;
    }

    return true;
}