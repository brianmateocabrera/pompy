const API_URL = '/api/crud';


export async function llamarAPI(
    action,
    path,
    extraData = {}
) {

    try {

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

                    body: JSON.stringify({
                        action,
                        path,
                        ...extraData
                    })
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


    } catch (error) {

        throw new Error(
            error.message ||
            'Error de comunicación con la API.'
        );
    }
}


/* ------------------------------------------
   AUTENTICACIÓN
------------------------------------------ */

export async function autenticarAdministrador(
    password
) {

    return llamarAPI(
        'AUTH',
        'data/productos.json',
        {
            password
        }
    );
}


/* ------------------------------------------
   CERRAR SESIÓN
------------------------------------------ */

export async function cerrarSesion() {

    return llamarAPI(
        'LOGOUT',
        'data/productos.json'
    );
}


/* ------------------------------------------
   ESTADO DE AUTENTICACIÓN
------------------------------------------ */

export async function comprobarSesion() {

    try {

        const resultado =
            await llamarAPI(
                'SESSION',
                'data/productos.json'
            );


        return resultado.success === true;


    } catch {

        return false;
    }
}
