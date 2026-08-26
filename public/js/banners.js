import {
    llamarAPI
} from './api.js';


const PATH_BANNERS =
    'data/banners.json';


let listaBanners = [];

let shaActualBanners = '';


/* ------------------------------------------
   OBTENER
------------------------------------------ */

export function obtenerBanners() {
    return listaBanners;
}


/* ------------------------------------------
   CARGAR
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
        json.data.map(normalizarBanner);

    shaActualBanners =
        json.sha || '';

    return listaBanners;
}


/* ------------------------------------------
   NORMALIZAR
------------------------------------------ */

function normalizarBanner(
    banner
) {

    return {

        id:
            banner.id ||
            generarId(),

        imagen:
            String(
                banner.imagen || ''
            ),

        titulo:
            String(
                banner.titulo || ''
            ).trim(),

        enlace:
            String(
                banner.enlace || ''
            ).trim(),

        activo:
            banner.activo !== false,

        orden:
            Number.isInteger(
                Number(banner.orden)
            )
                ? Number(banner.orden)
                : 0
    };
}


/* ------------------------------------------
   ID
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
   VALIDAR
------------------------------------------ */

function validarBanner(
    banner
) {

    if (!banner.imagen) {

        throw new Error(
            'El banner debe tener una imagen.'
        );
    }

    if (
        banner.titulo.length > 150
    ) {

        throw new Error(
            'El título del banner no puede superar los 150 caracteres.'
        );
    }

    if (
        banner.enlace.length > 500
    ) {

        throw new Error(
            'El enlace del banner es demasiado largo.'
        );
    }

    if (
        !Number.isInteger(
            Number(banner.orden)
        ) ||
        Number(banner.orden) < 0
    ) {

        throw new Error(
            'El orden del banner debe ser un número entero mayor o igual a 0.'
        );
    }
}


/* ------------------------------------------
   GUARDAR
------------------------------------------ */

export async function guardarBanners(
    banners,
    mensaje = 'Actualizar banners'
) {

    const listaNormalizada =
        banners.map(normalizarBanner);

    listaNormalizada.forEach(
        validarBanner
    );

    const json =
        await llamarAPI(
            'PUT',
            PATH_BANNERS,
            {
                message:
                    mensaje,

                content:
                    JSON.stringify(
                        listaNormalizada,
                        null,
                        2
                    ),

                sha:
                    shaActualBanners ||
                    undefined
            }
        );

    if (!json?.success) {

        throw new Error(
            json?.error ||
            'No se pudieron guardar los banners.'
        );
    }

    listaBanners =
        listaNormalizada;

    if (json.sha) {

        shaActualBanners =
            json.sha;
    }

    return listaBanners;
}


/* ------------------------------------------
   CREAR
------------------------------------------ */

export async function crearBanner(
    datos
) {

    const banner =
        normalizarBanner({

            id:
                generarId(),

            imagen:
                datos.imagen || '',

            titulo:
                datos.titulo || '',

            enlace:
                datos.enlace || '',

            activo:
                datos.activo !== false,

            orden:
                datos.orden ?? 0
        });


    validarBanner(
        banner
    );


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
   ACTUALIZAR
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


    const anterior =
        listaBanners[index];


    const actualizado =
        normalizarBanner({

            ...anterior,

            imagen:
                datos.imagen ??
                anterior.imagen,

            titulo:
                datos.titulo ??
                anterior.titulo,

            enlace:
                datos.enlace ??
                anterior.enlace,

            activo:
                datos.activo ??
                anterior.activo,

            orden:
                datos.orden ??
                anterior.orden
        });


    validarBanner(
        actualizado
    );


    const nuevaLista =
        [...listaBanners];


    nuevaLista[index] =
        actualizado;


    await guardarBanners(
        nuevaLista,
        `Actualizar banner: ${
            actualizado.titulo ||
            actualizado.id
        }`
    );


    return actualizado;
}


/* ------------------------------------------
   REORDENAR
------------------------------------------ */

export async function moverBanner(
    index,
    direccion
) {

    if (
        index < 0 ||
        index >= listaBanners.length
    ) {

        throw new Error(
            'Banner no encontrado.'
        );
    }


    const nuevaLista =
        [...listaBanners];


    const nuevoIndex =
        index + direccion;


    if (
        nuevoIndex < 0 ||
        nuevoIndex >= nuevaLista.length
    ) {
        return;
    }


    [
        nuevaLista[index],
        nuevaLista[nuevoIndex]
    ] = [
        nuevaLista[nuevoIndex],
        nuevaLista[index]
    ];


    nuevaLista.forEach(
        (banner, posicion) => {

            banner.orden =
                posicion;
        }
    );


    await guardarBanners(
        nuevaLista,
        'Reordenar banners'
    );
}


/* ------------------------------------------
   ELIMINAR
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


    nuevaLista.forEach(
        (item, posicion) => {

            item.orden =
                posicion;
        }
    );


    await guardarBanners(
        nuevaLista,
        `Eliminar banner: ${
            banner.titulo ||
            banner.id
        }`
    );


    return banner;
}