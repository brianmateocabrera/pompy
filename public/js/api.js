const API_URL = '/api/crud';


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


    const res =
        await fetch(
            API_URL,
            {
                method: 'POST',

                credentials: 'same-origin',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify(body)
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

        throw new Error(
            data.error ||
            data.message ||
            `Error HTTP ${res.status}`
        );
    }


    return data;
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
        // No es necesario hacer nada.
    }
}
