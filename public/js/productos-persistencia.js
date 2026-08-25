import { llamarAPI } from './api.js';

const PATH_JSON = 'data/productos.json';

let shaActualJson = '';


export function obtenerShaActual() {
    return shaActualJson;
}


export function establecerShaActual(
    sha
) {
    shaActualJson = sha || '';
}


export async function cargarProductosDesdeAPI() {

    const json =
        await llamarAPI(
            'GET',
            PATH_JSON
        );

    if (!json.success) {

        throw new Error(
            json.error ||
            'No se pudo cargar el inventario.'
        );
    }

    shaActualJson =
        json.sha || '';

    return Array.isArray(json.data)
        ? json.data
        : [];
}


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


        if (json.success) {

            if (json.sha) {
                shaActualJson =
                    json.sha;
            }

            return {
                success: true
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
            error.status === 409 ||
            error.conflict === true
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
                error.message ||
                'Error al actualizar el catálogo.'
        };
    }
}
