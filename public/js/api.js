const API_URL = '/api/crud';

const AUTH_KEY = 'admin_authenticated';

export async function llamarAPI(
    action,
    path,
    extraData = {}
) {

    try {

        const password =
            sessionStorage.getItem(
                AUTH_KEY
            );


        const datos = {
            action,
            path,
            ...extraData
        };


        /*
         * Las operaciones protegidas utilizan
         * automáticamente la contraseña almacenada
         * durante la sesión.
         */

        if (
            action !== 'AUTH' &&
            password
        ) {
            datos.password = password;
        }


        const res = await fetch(
            API_URL,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify(datos)
            }
        );


        let data;

        try {

            data = await res.json();

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

    const resultado =
        await llamarAPI(
            'AUTH',
            'data/productos.json',
            {
                password
            }
        );


    if (
        resultado.success
    ) {

        sessionStorage.setItem(
            AUTH_KEY,
            password
        );
    }


    return resultado;
}


/* ------------------------------------------
   CERRAR SESIÓN
------------------------------------------ */

export function cerrarSesion() {

    sessionStorage.removeItem(
        AUTH_KEY
    );
}


/* ------------------------------------------
   ESTADO DE AUTENTICACIÓN
------------------------------------------ */

export function administradorAutenticado() {

    return Boolean(
        sessionStorage.getItem(
            AUTH_KEY
        )
    );
}
