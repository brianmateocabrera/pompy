import { llamarAPI } from './api.js';

const PATH_JSON = 'data/productos.json';

const CARGA_TIMEOUT = 10000;

let shaActualJson = '';


/* ------------------------------------------
   CARGAR PRODUCTOS DESDE API
------------------------------------------ */

export async function cargarProductosDesdeAPI() {

    let timeoutId;

    const timeout =
        new Promise(
            (_, reject) => {

                timeoutId =
                    setTimeout(
                        () => {

                            const error =
                                new Error(
                                    'La carga del inventario tardó demasiado. La API no respondió dentro de 10 segundos.'
                                );

                            error.code =
                                'INVENTARIO_TIMEOUT';

                            reject(error);

                        },
                        CARGA_TIMEOUT
                    );
            }
        );


    const carga =
        cargarDesdeAPI();


    try {

        return await Promise.race([
            carga,
            timeout
        ]);

    } finally {

        clearTimeout(
            timeoutId
        );
    }
}


/* ------------------------------------------
   PETICIÓN REAL
------------------------------------------ */

async function cargarDesdeAPI() {

    const json =
        await llamarAPI(
            'GET',
            PATH_JSON
        );


    if (!json) {

        throw new Error(
            'La API no devolvió una respuesta.'
        );
    }


    if (!json.success) {

        throw new Error(
            json.error ||
            'No se pudo cargar el inventario.'
        );
    }


    shaActualJson =
        json.sha || '';


    if (!Array.isArray(json.data)) {

        throw new Error(
            'El catálogo recibido no tiene un formato válido.'
        );
    }


    return json.data;
}


/* ------------------------------------------
   GUARDAR PRODUCTOS
------------------------------------------ */

export async function guardarProductos(
    productos,
    mensajeCommit
) {

    try {

        const json =
            await llamarAPI(
                'PUT',
                PATH_JSON,
                {
                    message:
                        mensajeCommit,

                    content:
                        JSON.stringify(
                            productos,
                            null,
                            2
                        ),

                    sha:
                        shaActualJson ||
                        undefined
                }
            );


        if (!json) {

            return {
                success: false,
                error:
                    'La API no devolvió una respuesta.'
            };
        }


        if (json.success) {

            if (json.sha) {

                shaActualJson =
                    json.sha;
            }

            return {
                success: true
            };
        }


        if (
            json.status === 409 ||
            json.conflict === true
        ) {

            return {

                success: false,

                conflict: true,

                error:
                    'El catálogo fue modificado desde otro dispositivo.'
            };
        }


        return {

            success: false,

            error:
                json.error ||
                'Error al actualizar el catálogo.'
        };


    } catch (error) {

        if (
            error?.status === 409 ||
            error?.conflict === true
        ) {

            return {

                success: false,

                conflict: true,

                error:
                    'El catálogo fue modificado desde otro dispositivo.'
            };
        }


        return {

            success: false,

            error:
                error?.message ||
                'Error al actualizar el catálogo.'
        };
    }
}
