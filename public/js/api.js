const API_URL = '/api/crud';

let adminPassword = '';


export function establecerPassword(password) {
    adminPassword = String(password || '');
}


export function limpiarPassword() {
    adminPassword = '';
}


export async function llamarAPI(
    action,
    path,
    extraData = {}
) {

    try {

        const datos = {
            action,
            path,
            ...extraData
        };


        // Solo enviar contraseña en operaciones de escritura
        if (action !== 'GET') {

            if (!adminPassword) {
                throw new Error(
                    'No hay contraseña de administrador.'
                );
            }

            datos.password = adminPassword;
        }


        const res = await fetch(
            API_URL,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify(datos)
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
