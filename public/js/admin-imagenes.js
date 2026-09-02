import {
    obtenerProductos,
    actualizarImagenes
} from './productos.js';

import {
    mostrarCargando,
    renderizarImagenesFormulario
} from './ui.js';


const fileInput =    document.getElementById('imagenFile');

const preview =    document.getElementById('imagenesPreview');


// =================================================
// VALIDAR IMÁGENES
// =================================================

export function validarArchivosImagen(    archivos
) {

    for (const archivo of archivos) {

        if (
            !archivo.type ||
            !archivo.type.startsWith('image/')
        ) {

            throw new Error(
                `"${archivo.name}" no es un archivo de imagen válido.`
            );
        }

        if (archivo.size === 0) {

            throw new Error(
                `"${archivo.name}" está vacío.`
            );
        }
    }
}


// =================================================
// PREVISUALIZAR ARCHIVOS NUEVOS
// =================================================

export function mostrarPrevisualizacionArchivos(    archivos,
    agregar = false
) {

    if (!agregar) {
        preview.innerHTML = '';
    }

    archivos.forEach(        archivo => {

            const reader =
                new FileReader();

            reader.onload =                event => {

                    const item =                        document.createElement(
                            'div'                        );

                    item.className =
                        'imagen-preview-item';

                    const img =                        document.createElement(
                            'img'                        );

                    img.src =                        event.target.result;

                    img.alt =                        archivo.name;

                    const label =                        document.createElement(
                            'p'                        );

     

               label.className =
                        'imagen-label';

                    label.textContent =                        archivo.name;

                    item.appendChild(img);
                    item.appendChild(label);

                    preview.appendChild(item);
                };

            reader.readAsDataURL(                archivo
            );
        }
    );
}


// =================================================
// ACTUALIZAR ORDEN LOCAL
// =================================================

function actualizarOrdenLocal(    imagenes
) {

    imagenes.forEach(
        (imagen, index) => {

            imagen.orden =                index;
        }
    );
}


// =================================================
// OBTENER IMÁGENES DEL PRODUCTO
// =================================================

function obtenerImagenesProducto(    producto
) {

    if (        Array.isArray(            producto.imagenes
        )
    ) {

        return [
            ...producto.imagenes
        ];
    }

    if (        producto.imagen
    ) {

        return [{
            url:
                producto.imagen,

            alt:
                producto.nombre,

            orden:
                0
        }];
    }

    return [];
}


// =================================================
// GUARDAR CAMBIOS DE IMÁGENES
// =================================================

async function guardarOrdenImagenes(    indexProducto,
    imagenes,
    imagenPrincipal,
    mensaje,
    alGuardar
) {

    mostrarCargando(        true,
        mensaje
    );

    try {

        actualizarOrdenLocal(            imagenes
        );

        await actualizarImagenes(            indexProducto,
            imagenes,
            imagenPrincipal
        );

        const productoActualizado =            obtenerProductos()[
                indexProducto
            ];

        renderizarImagenesFormulario(            productoActualizado
        );


 
       if (typeof alGuardar === 'function') {
            await alGuardar();
        }

    } catch (error) {

        throw error;

    } finally {

        mostrarCargando(false);
    }
}


// =================================================
// CONFIGURAR PREVISUALIZACIÓN
// =================================================

export function configurarPrevisualizacion() {

    fileInput.addEventListener(
        'change',
        () => {

            const archivos =                Array.from(                    fileInput.files
                );

            if (                archivos.length === 0
            ) {
                return;
            }

            try {

                validarArchivosImagen(                    archivos
                );

            } catch (error) {

                alert(                    error.message
                );

                fileInput.value = '';

                return;
            }

            const index =                parseInt(                    document.getElementById(
                        'editIndex'                    ).value,
                    10
                );

            if (index === -1) {

                mostrarPrevisualizacionArchivos(                    archivos
                );

                return;
            }

            const producto =                obtenerProductos()[index];

            if (!producto) {
                return;
            }

            renderizarImagenesFormulario(                producto
            );

            mostrarPrevisualizacionArchivos(                archivos,
                true
            );
        }
    );
}


// =================================================
// CONFIGURAR GESTIÓN DE IMÁGENES
// =================================================

export function configurarGestionImagenes(    verificarAutenticacion,
    manejarErrorSesion,
    renderizarTabla,
    iniciarEdicion,
    iniciarEliminacion
) {

    preview.addEventListener(
        'click',
        async event => {

            const boton =                event.target.closest(
                    'button'                );

            if (!boton) {
                return;
            }

            const autenticado =
                await verificarAutenticacion();

            if (!autenticado) {
                return;
            }

            const indexProducto =                parseInt(                    document.getElementById(
                        'editIndex'                    ).value,
                    10
                );

            if (                Number.isNaN(                    indexProducto
                ) ||
                indexProducto < 0
            ) {
                return;
            }

            const producto =                obtenerProductos()[
                    indexProducto
                ];

            if (!producto) {
                return;
            }

            const imagenes =                obtenerImagenesProducto(                    producto
                );

            const indexImagen =                parseInt(                    boton.dataset.imagenIndex,
                    10
                );

            if (                Number.isNaN(indexImagen) ||
                indexImagen < 0 ||
                indexImagen >= imagenes.length
            ) {
                return;
            }


            // =========================================
            // HACER PRINCIPAL
            // =========================================

            if (                boton.classList.contains(
                    'btn-imagen-principal'                )
            ) {

                try {

                    await guardarOrdenImagenes(                        indexProducto,
                        imagenes,
                        imagenes[indexImagen].url,
                        'Guardando imagen principal...',
         
  
             async () => {

                            renderizarTabla(                                obtenerProductos(),
                                iniciarEdicion,
                                iniciarEliminacion
                            );
                        }
                    );

                } catch (error) {

                    alert(
                        'Error al actualizar las imágenes: ' +
                        error.message
                    );

                    await manejarErrorSesion(                        error
                    );
                }

                return;
            }


            // =========================================
            // SUBIR
            // =========================================

            if (                boton.classList.contains(
                    'btn-subir-imagen'                )
            ) {

                if (                    indexImagen === 0
                ) {
                    return;
                }

                [
                    imagenes[indexImagen - 1],
                    imagenes[indexImagen]
                ] = [
                    imagenes[indexImagen],
                    imagenes[indexImagen - 1]
                ];

                try {

                    await guardarOrdenImagenes(                        indexProducto,
                        imagenes,
                        producto.imagenPrincipal,
                        'Reordenando imágenes...',
                        async () => {

                            renderizarTabla(                                obtenerProductos(),
                                iniciarEdicion,
                                iniciarEliminacion
                            );
                        }
                    );

                } catch (error) {

                    alert(
                        'Error al actualizar las imágenes: ' +
                        error.message
                    );

                    await manejarErrorSesion(                        error
                    );
                }

                return;
            }


            // =========================================
            // BAJAR
            // =========================================

            if (                boton.classList.contains(
                    'btn-bajar-imagen'                )
            ) {

                if (                    indexImagen >=                    imagenes.length - 1
                ) {
                    return;
                }

                [
                    imagenes[indexImagen],
                    imagenes[indexImagen + 1]
                ] = [
                    imagenes[indexImagen + 1],
                    imagenes[indexImagen]
                ];

                try {

                    await guardarOrdenImagenes(                        indexProducto,
                        imagenes,
                        producto.imagenPrincipal,
                        'Reordenando imágenes...',
                        async () => {

                            renderizarTabla(                                obtenerProductos(),
                                iniciarEdicion,
                                iniciarEliminacion
                            );
                        }
                    );

                } catch (error) {

                    alert(
                        'Error al actualizar las imágenes: ' +
                        error.message
                    );

                    await manejarErrorSesion(                        error
                    );
                }

                return;
            }


            // =========================================
            // ELIMINAR
            // =========================================

            if (boton.classList.contains('btn-eliminar-imagen')) {

                if (
                    !confirm(
                        '¿Eliminar esta imagen del producto?'                    )
                ) {
                    return;
                }

                const imagenEliminada =                    imagenes[indexImagen];

                imagenes.splice(                    indexImagen,
                    1
                );

                actualizarOrdenLocal(                    imagenes
                );

                let imagenPrincipal =                    producto.imagenPrincipal;

                if (                    imagenPrincipal ===                    imagenEliminada.url
                ) {

                    imagenPrincipal =                        imagenes[0]?.url ||
                        '';
                }

                try {

                    await guardarOrdenImagenes(                        indexProducto,
                        imagenes,
                        imagenPrincipal,
                        'Eliminando imagen...',
                        async () => {

                            renderizarTabla(                                obtenerProductos(),
                                iniciarEdicion,
                                iniciarEliminacion
                            );
                        }
                    );

                } catch (error) {

                    alert(
                        'Error al actualizar las imágenes: ' +
                        error.message
                    );

                    await manejarErrorSesion(                        error
                    );
                }
            }
        }
    );
}
