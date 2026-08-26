import { llamarAPI } from './api.js';

const PATH_BANNERS = 'data/banners.json';

let banners = [];
let shaActual = '';


/* ------------------------------------------
   OBTENER BANNERS
------------------------------------------ */

export function obtenerBanners() {
    return banners;
}


/* ------------------------------------------
   CARGAR BANNERS
------------------------------------------ */

export async function cargarBanners() {

    const json =
        await llamarAPI(
            'GET',
            PATH_BANNERS
        );

    if (!json?.success) {
        throw new Error(
            json?.error ||
            'No se pudieron cargar los banners.'
        );
    }

    if (!Array.isArray(json.data)) {
        throw new Error(
            'El archivo de banners no tiene un formato válido.'
        );
    }

    banners = json.data;
    shaActual = json.sha || '';

    return banners;
}


/* ------------------------------------------
   GUARDAR BANNERS
------------------------------------------ */

async function guardarBanners(
    mensaje
) {

    const json =
        await llamarAPI(
            'PUT',
            PATH_BANNERS,
            {
                message: mensaje,

                content:
                    JSON.stringify(
                        banners,
                        null,
                        2
                    ),

                sha:
                    shaActual ||
                    undefined
            }
        );

    if (!json?.success) {

        if (
            json?.status === 409 ||
            json?.conflict === true
        ) {
            throw new Error(
                'Los banners fueron modificados desde otro dispositivo.'
            );
        }

        throw new Error(
            json?.error ||
            'No se pudieron guardar los banners.'
        );
    }

    if (json.sha) {
        shaActual = json.sha;
    }
}


/* ------------------------------------------
   GENERAR ID
------------------------------------------ */

function generarId() {

    return 'banner-' +
        Date.now().toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .substring(2, 8);
}


/* ------------------------------------------
   NORMALIZAR
------------------------------------------ */

function normalizarBanner(
    datos,
    bannerAnterior = null
) {

    return {

        id:
            bannerAnterior?.id ||
            generarId(),

        imagen:
            String(
                datos.imagen || ''
            ).trim(),

        titulo:
            String(
                datos.titulo || ''
            ).trim(),

        texto:
            String(
                datos.texto || ''
            ).trim(),

        enlace:
            String(
                datos.enlace || ''
            ).trim(),

        activo:
            datos.activo !== false,

        orden:
            Number(
                datos.orden
            ) || 0
    };
}


/* ------------------------------------------
   CREAR
------------------------------------------ */

export async function crearBanner(
    datos
) {

    if (!datos.imagen) {
        throw new Error(
            'El banner necesita una imagen.'
        );
    }

    const banner =
        normalizarBanner(
            datos
        );

    banners.push(
        banner
    );

    await guardarBanners(
        `Crear banner: ${banner.titulo || banner.id}`
    );

    return banner;
}


/* ------------------------------------------
   EDITAR
------------------------------------------ */

export async function editarBanner(
    index,
    datos
) {

    if (
        index < 0 ||
        index >= banners.length
    ) {
        throw new Error(
            'Banner no encontrado.'
        );
    }

    const banner =
        normalizarBanner(
            datos,
            banners[index]
        );

    if (!banner.imagen) {
        throw new Error(
            'El banner necesita una imagen.'
        );
    }

    banners[index] =
        banner;

    await guardarBanners(
        `Actualizar banner: ${banner.titulo || banner.id}`
    );

    return banner;
}


/* ------------------------------------------
   ELIMINAR
------------------------------------------ */

export async function eliminarBanner(
    index
) {

    if (
        index < 0 ||
        index >= banners.length
    ) {
        throw new Error(
            'Banner no encontrado.'
        );
    }

    const eliminado =
        banners[index];

    banners.splice(
        index,
        1
    );

    await guardarBanners(
        `Eliminar banner: ${eliminado.titulo || eliminado.id}`
    );

    return eliminado;
}


/* ------------------------------------------
   REORDENAR
------------------------------------------ */

export async function reordenarBanner(
    index,
    nuevaPosicion
) {

    if (
        index < 0 ||
        index >= banners.length
    ) {
        throw new Error(
            'Banner no encontrado.'
        );
    }

    const banner =
        banners.splice(
            index,
            1
        )[0];

    const posicion =
        Math.max(
            0,
            Math.min(
                nuevaPosicion,
                banners.length
            )
        );

    banners.splice(
        posicion,
        0,
        banner
    );

    banners.forEach(
        (item, i) => {
            item.orden = i;
        }
    );

    await guardarBanners(
        'Reordenar banners'
    );
}


/* ------------------------------------------
   ACTIVAR / DESACTIVAR
------------------------------------------ */

export async function cambiarEstadoBanner(
    index,
    activo
) {

    if (
        index < 0 ||
        index >= banners.length
    ) {
        throw new Error(
            'Banner no encontrado.'
        );
    }

    banners[index].activo =
        activo === true;

    await guardarBanners(
        `${activo ? 'Activar' : 'Desactivar'} banner`
    );
}