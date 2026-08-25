const API_URL = '/api/crud';

const API_TIMEOUT = 15000;


/* ------------------------------------------
   LLAMAR API
------------------------------------------ */

export async function llamarAPI(
    action,
    path = '',
    extraData = {}
) {

    const body = {
        action,
        ...(path ? { path } : {}),
        ...extraData
    };


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => {
                controller.abort();
            },
            API_TIMEOUT
        );


    try {

        const res =
            await fetch(
                API_URL,
                {
                    method: 'POST',

                    credentials:
                        'same-origin',

                    cache:
                        'no-store',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(body),

                    signal:
                        controller.signal
                }
            );


        let data;


        try {

            data =
                await res.json();

        } catch {

            throw new Error(
                `La API devolvió una respuesta no válida (HTTP ${res.status}).`
            );
        }


        if (!res.ok) {

            const error =
                new Error(
                    data.error ||
                    data.message ||
                    `Error HTTP ${res.status}`
                );


            error.status =
                res.status;


            error.conflict =
                data.conflict === true;


            throw error;
        }


        return data;


    } catch (error) {

        if (
            error.name === 'AbortError'
        ) {

            const timeoutError =
                new Error(
                    `La API no respondió dentro de ${API_TIMEOUT / 1000} segundos.`
                );


            timeoutError.code =
                'API_TIMEOUT';


            throw timeoutError;
        }


        throw error;


    } finally {

        clearTimeout(
            timeout
        );
    }
}


/* ------------------------------------------
   AUTENTICAR ADMINISTRADOR
------------------------------------------ */

export async function autenticarAdministrador(
    password
) {

    return await llamarAPI(
        'AUTH',
        '',
        {
            password
        }
    );
}


/* ------------------------------------------
   COMPROBAR SESIÓN
------------------------------------------ */

export async function administradorAutenticado() {

    try {

        const resultado =
            await llamarAPI(
                'SESSION'
            );


        return resultado.success === true;


    } catch {

        return false;
    }
}


/* ------------------------------------------
   CERRAR SESIÓN
------------------------------------------ */

export async function cerrarSesion() {

    try {

        await llamarAPI(
            'LOGOUT'
        );

    } catch {

        // La sesión puede ya estar expirada.
    }
}
