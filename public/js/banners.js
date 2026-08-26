import {
    llamarAPI
} from './api.js';


const PATH_BANNERS =
    'data/banners.json';


let listaBanners = [];

let shaActualBanners = '';


/* ------------------------------------------
   OBTENER BANNERS
------------------------------------------ */

export function obtenerBanners() {

    return listaBanners;
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
            'El archivo de banners tiene un formato inválido.'
        );
    }


    listaBanners =
        json.data;

    shaActualBanners =
        json.sha || '';


    return listaBanners;
}


/* ------------------------------------------
   GUARDAR BANNERS
------------------------------------------ */

export async function guardarBanners(
    banners,
    mensaje = 'Actualizar banners'
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
                    shaActualBanners ||
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


    listaBanners =
        banners;


    if (json.sha) {

        shaActualBanners =
            json.sha;
    }


    return listaBanners;
}


/* ------------------------------------------
   CREAR BANNER
------------------------------------------ */

export async function crearBanner(
    datos
) {

    const banner = {

        id:
            'banner-' +
            Date.now().toString(36) +
            '-' +
            Math.random()
                .toString(36)
                .substring(2, 8),

        imagen:
            datos.imagen || '',

        titulo:
            String(
                datos.titulo || ''
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


    const nuevaLista = [
        ...listaBanners,
        banner
    ];


    await guardarBanners(
        nuevaLista,
        `Crear banner: ${banner.titulo || banner.id}`
    );


    return banner;
}


/* ------------------------------------------
   ACTUALIZAR BANNER
------------------------------------------ */

export async function actualizarBanner(
    index,
    datos
) {

    if (
        index < 0 ||
        index >= listaBanners.length
    ) {

        throw new Error(
            'Banner no encontrado.'
        );
    }


    const bannerAnterior =
        listaBanners[index];


    const bannerActualizado = {

        ...bannerAnterior,

        imagen:
            datos.imagen ??
            bannerAnterior.imagen,

        titulo:
            String(
                datos.titulo ??
                bannerAnterior.titulo ??
                ''
            ).trim(),

        enlace:
            String(
                datos.enlace ??
                bannerAnterior.enlace ??
                ''
            ).trim(),

        activo:
            datos.activo ??
            bannerAnterior.activo,

        orden:
            Number(
                datos.orden ??
                bannerAnterior.orden ??
                0
            )
    };


    const nuevaLista =
        [...listaBanners];


    nuevaLista[index] =
        bannerActualizado;


    await guardarBanners(
        nuevaLista,
        `Actualizar banner: ${bannerActualizado.titulo || bannerActualizado.id}`
    );


    return bannerActualizado;
}


/* ------------------------------------------
   ELIMINAR BANNER
------------------------------------------ */

export async function eliminarBanner(
    index
) {

    if (
        index < 0 ||
        index >= listaBanners.length
    ) {

        throw new Error(
            'Banner no encontrado.'
        );
    }


    const banner =
        listaBanners[index];


    const nuevaLista =
        listaBanners.filter(
            (_, posicion) =>
                posicion !== index
        );


    await guardarBanners(
        nuevaLista,
        `Eliminar banner: ${banner.titulo || banner.id}`
    );


    return banner;
}