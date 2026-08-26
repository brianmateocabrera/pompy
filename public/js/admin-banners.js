import {
    cargarBanners,
    obtenerBanners,
    crearBanner,
    actualizarBanner,
    eliminarBanner
} from './banners.js';

import {
    llamarAPI
} from './api.js';

import {
    verificarAutenticacion,
    manejarErrorSesion
} from './admin-auth.js';


const formulario =
    document.getElementById(
        'bannerForm'
    );

const lista =
    document.getElementById(
        'listaBanners'
    );

const fileInput =
    document.getElementById(
        'bannerImagen'
    );


let indexEditando = -1;


/* ------------------------------------------
   OPTIMIZAR Y SUBIR IMAGEN
------------------------------------------ */

async function subirImagenBanner(
    archivo
) {

    const imagen =
        await import(
            './imageOptimizer.js'
        );


    const dataUrl =
        await imagen.optimizarImagen(
            archivo
        );


    const partes =
        dataUrl.split(',');


    if (partes.length < 2) {

        throw new Error(
            'Formato de imagen inválido.'
        );
    }


    const nombre =
        archivo.name
            .toLowerCase()
            .split('.')[0]
            .replace(
                /[^a-z0-9]/gi,
                '_'
            );


    const nombreArchivo =
        `${Date.now()}-${nombre}.webp`;


    const ruta =
        `public/imagenes/${nombreArchivo}`;


    const json =
        await llamarAPI(
            'PUT',
            ruta,
            {
                message:
                    `Subir banner: ${nombreArchivo}`,

                content:
                    partes[1]
            }
        );


    if (!json?.success) {

        throw new Error(
            json?.error ||
            'No se pudo subir la imagen.'
        );
    }


    return ruta.replace(
        'public/',
        '/'
    );
}


/* ------------------------------------------
   RENDERIZAR
------------------------------------------ */

function renderizarBanners() {

    const banners =
        obtenerBanners();


    if (!banners.length) {

        lista.innerHTML =
            '<p class="sin-banners">No hay banners cargados.</p>';

        return;
    }


    const ordenados =
        banners
            .map(
                (banner, index) => ({
                    ...banner,
                    _index: index
                })
            )
            .sort(
                (a, b) =>
                    (a.orden || 0) -
                    (b.orden || 0)
            );


    lista.innerHTML =
        ordenados.map(
            banner => `

                <article
                    class="banner-admin-card"
                    data-index="${banner._index}"
                >

                    <img
                        src="${escaparHTML(banner.imagen)}"
                        alt="${escaparHTML(banner.titulo)}"
                        onerror="this.src='/imagenes/no-image.webp'"
                    >

                    <div class="banner-admin-info">

                        <strong>
                            ${escaparHTML(
                                banner.titulo ||
                                'Sin título'
                            )}
                        </strong>

                        <span>
                            Orden: ${banner.orden || 0}
                        </span>

                        <span class="${
                            banner.activo
                                ? 'banner-activo'
                                : 'banner-inactivo'
                        }">
                            ${
                                banner.activo
                                    ? 'Activo'
                                    : 'Inactivo'
                            }
                        </span>

                    </div>

                    <div class="banner-admin-actions">

                        <button
                            type="button"
                            class="btn-banner-editar"
                            data-index="${banner._index}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="btn-banner-toggle"
                            data-index="${banner._index}"
                        >
                            ${
                                banner.activo
                                    ? 'Desactivar'
                                    : 'Activar'
                            }
                        </button>

                        <button
                            type="button"
                            class="btn-banner-eliminar"
                            data-index="${banner._index}"
                        >
                            Eliminar
                        </button>

                    </div>

                </article>

            `
        ).join('');
}


/* ------------------------------------------
   ESCAPAR HTML
------------------------------------------ */

function escaparHTML(
    texto
) {

    return String(
        texto ?? ''
    )
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        );
}


/* ------------------------------------------
   LIMPIAR FORMULARIO
------------------------------------------ */

function limpiarFormulario() {

    formulario.reset();

    indexEditando =
        -1;

    document.getElementById(
        'bannerFormTitle'
    ).textContent =
        'Agregar banner';

    document.getElementById(
        'btnBannerGuardar'
    ).textContent =
        'Agregar banner';

    document.getElementById(
        'btnBannerCancelar'
    ).style.display =
        'none';

    document.getElementById(
        'bannerImagenActual'
    ).innerHTML = '';

    fileInput.required =
        true;
}


/* ------------------------------------------
   CARGAR BANNER EN FORMULARIO
------------------------------------------ */

function editarBanner(
    index
) {

    const banner =
        obtenerBanners()[index];


    if (!banner) {
        return;
    }


    indexEditando =
        index;


    document.getElementById(
        'bannerTitulo'
    ).value =
        banner.titulo || '';


    document.getElementById(
        'bannerEnlace'
    ).value =
        banner.enlace || '';


    document.getElementById(
        'bannerOrden'
    ).value =
        banner.orden ?? 0;


    document.getElementById(
        'bannerActivo'
    ).checked =
        banner.activo !== false;


    document.getElementById(
        'bannerFormTitle'
    ).textContent =
        'Editar banner';


    document.getElementById(
        'btnBannerGuardar'
    ).textContent =
        'Guardar cambios';


    document.getElementById(
        'btnBannerCancelar'
    ).style.display =
        'inline-block';


    fileInput.required =
        false;


    document.getElementById(
        'bannerImagenActual'
    ).innerHTML = `
        <img
            src="${escaparHTML(banner.imagen)}"
            alt="Imagen actual"
            onerror="this.src='/imagenes/no-image.webp'"
        >
    `;


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


/* ------------------------------------------
   CARGAR
------------------------------------------ */

async function iniciar() {

    try {

        await cargarBanners();

        renderizarBanners();

    } catch (error) {

        const manejado =
            await manejarErrorSesion(
                error,
                iniciar
            );

        if (manejado) {
            return;
        }

        lista.innerHTML =
            `<p class="error-banners">
                ${escaparHTML(error.message)}
            </p>`;
    }
}


/* ------------------------------------------
   GUARDAR
------------------------------------------ */

formulario.addEventListener(
    'submit',
    async event => {

        event.preventDefault();


        const autenticado =
            await verificarAutenticacion();

        if (!autenticado) {
            return;
        }


        const archivo =
            fileInput.files[0];


        if (
            indexEditando === -1 &&
            !archivo
        ) {

            alert(
                'Seleccioná una imagen para el banner.'
            );

            return;
        }


        try {

            const datos = {

                titulo:
                    document.getElementById(
                        'bannerTitulo'
                    ).value.trim(),

                enlace:
                    document.getElementById(
                        'bannerEnlace'
                    ).value.trim(),

                orden:
                    document.getElementById(
                        'bannerOrden'
                    ).value,

                activo:
                    document.getElementById(
                        'bannerActivo'
                    ).checked
            };


            if (archivo) {

                datos.imagen =
                    await subirImagenBanner(
                        archivo
                    );
            }


            if (indexEditando === -1) {

                await crearBanner(
                    datos
                );

            } else {

                await actualizarBanner(
                    indexEditando,
                    datos
                );
            }


            alert(
                'Banner guardado correctamente.'
            );


            limpiarFormulario();

            renderizarBanners();


        } catch (error) {

            alert(
                'Error: ' +
                error.message
            );

            await manejarErrorSesion(
                error,
                iniciar
            );
        }
    }
);


/* ------------------------------------------
   ACCIONES
------------------------------------------ */

lista.addEventListener(
    'click',
    async event => {

        const boton =
            event.target.closest(
                'button'
            );

        if (!boton) {
            return;
        }


        const index =
            Number(
                boton.dataset.index
            );


        if (
            Number.isNaN(index)
        ) {
            return;
        }


        const autenticado =
            await verificarAutenticacion();

        if (!autenticado) {
            return;
        }


        try {

            if (
                boton.classList.contains(
                    'btn-banner-editar'
                )
            ) {

                editarBanner(index);

                return;
            }


            if (
                boton.classList.contains(
                    'btn-banner-toggle'
                )
            ) {

                const banner =
                    obtenerBanners()[index];


                await actualizarBanner(
                    index,
                    {
                        activo:
                            !banner.activo
                    }
                );


                renderizarBanners();

                return;
            }


            if (
                boton.classList.contains(
                    'btn-banner-eliminar'
                )
            ) {

                const banner =
                    obtenerBanners()[index];


                if (
                    !confirm(
                        `¿Eliminar el banner "${banner.titulo || 'sin título'}"?`
                    )
                ) {
                    return;
                }


                await eliminarBanner(
                    index
                );


                renderizarBanners();
            }

        } catch (error) {

            alert(
                'Error: ' +
                error.message
            );

            await manejarErrorSesion(
                error,
                iniciar
            );
        }
    }
);


/* ------------------------------------------
   CANCELAR
------------------------------------------ */

document
    .getElementById(
        'btnBannerCancelar'
    )
    .addEventListener(
        'click',
        limpiarFormulario
    );


iniciar();