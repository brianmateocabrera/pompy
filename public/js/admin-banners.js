import {
    cargarBanners,
    obtenerBanners,
    crearBanner,
    actualizarBanner,
    eliminarBanner,
    moverBanner
} from './banners.js';

import {
    procesarImagen
} from './productos-imagenes.js';

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
   ESCAPAR HTML
------------------------------------------ */

function escaparHTML(
    texto
) {

    return String(
        texto ?? ''
    )
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
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
                    a.orden - b.orden
            );


    lista.innerHTML =
        ordenados.map(
            (banner, posicion) => `

                <article
                    class="banner-admin-card"
                >

                    <img
                        src="${escaparHTML(banner.imagen)}"
                        alt="${escaparHTML(
                            banner.titulo ||
                            'Banner'
                        )}"
                        class="banner-admin-image"
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
                            Orden: ${posicion + 1}
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

                        ${
                            banner.enlace
                                ? `
                                    <span>
                                        Enlace: ${
                                            escaparHTML(
                                                banner.enlace
                                            )
                                        }
                                    </span>
                                `
                                : ''
                        }

                    </div>

                    <div class="banner-admin-actions">

                        <button
                            type="button"
                            class="btn-banner-subir"
                            data-index="${banner._index}"
                            ${posicion === 0 ? 'disabled' : ''}
                        >
                            Subir
                        </button>

                        <button
                            type="button"
                            class="btn-banner-bajar"
                            data-index="${banner._index}"
                            ${
                                posicion === ordenados.length - 1
                                    ? 'disabled'
                                    : ''
                            }
                        >
                            Bajar
                        </button>

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
    ).innerHTML =
        '';


    fileInput.required =
        true;
}


/* ------------------------------------------
   EDITAR
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
            class="banner-imagen-actual"
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
                    Number(
                        document.getElementById(
                            'bannerOrden'
                        ).value
                    ) || 0,

                activo:
                    document.getElementById(
                        'bannerActivo'
                    ).checked
            };


            if (archivo) {

                datos.imagen =
                    await procesarImagen(
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

            /* SUBIR */

            if (
                boton.classList.contains(
                    'btn-banner-subir'
                )
            ) {

                await moverBanner(
                    index,
                    -1
                );

                renderizarBanners();

                return;
            }


            /* BAJAR */

            if (
                boton.classList.contains(
                    'btn-banner-bajar'
                )
            ) {

                await moverBanner(
                    index,
                    1
                );

                renderizarBanners();

                return;
            }


            /* EDITAR */

            if (
                boton.classList.contains(
                    'btn-banner-editar'
                )
            ) {

                editarBanner(index);

                return;
            }


            /* ACTIVAR / DESACTIVAR */

            if (
                boton.classList.contains(
                    'btn-banner-toggle'
                )
            ) {

                const banner =
                    obtenerBanners()[index];


                if (!banner) {
                    return;
                }


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


            /* ELIMINAR */

            if (
                boton.classList.contains(
                    'btn-banner-eliminar'
                )
            ) {

                const banner =
                    obtenerBanners()[index];


                if (!banner) {
                    return;
                }


                if (
                    !confirm(
                        `¿Eliminar el banner "${
                            banner.titulo ||
                            'sin título'
                        }"?`
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


/* ------------------------------------------
   INICIO
------------------------------------------ */

iniciar();