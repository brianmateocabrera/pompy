import {
    cargarProductos,
    obtenerProductos,
    crearProducto,
    editarProducto,
    eliminarProducto,
    actualizarImagenes
} from './productos.js';


import {
    cerrarSesion
} from './api.js';


import {
    mostrarCargando,
    renderizarTabla,
    cargarFormulario,
    renderizarImagenesFormulario,
    cancelarEdicion,
    obtenerListaFormulario
} from './ui.js';


import {
    autenticar,
    verificarAutenticacion,
    manejarErrorSesion
} from './admin-auth.js';


const formulario =
    document.getElementById('prodForm');


const fileInput =
    document.getElementById('imagenFile');


const preview =
    document.getElementById('imagenesPreview');


// =================================================
// CARGAR INVENTARIO
// =================================================

async function cargarInventario() {

    mostrarCargando(
        true,
        'Cargando inventario desde GitHub...'
    );


    try {

        await cargarProductos();


        renderizarTabla(
            obtenerProductos(),
            iniciarEdicion,
            iniciarEliminacion
        );


    } catch (error) {

        const manejado =
            await manejarErrorSesion(
                error,
                cargarInventario
            );


        if (manejado) {
            return;
        }


        alert(
            'Error al conectar con la base de datos: ' +
            error.message
        );


    } finally {

        mostrarCargando(false);
    }
}


// =================================================
// OBTENER DATOS DEL FORMULARIO
// =================================================

function obtenerDatosFormulario() {

    return {

        sku:
            document.getElementById(
                'sku'
            ).value.trim(),

        nombre:
            document.getElementById(
                'nombre'
            ).value.trim(),

        precioCosto:
            document.getElementById(
                'precioCosto'
            ).value,

        precio:
            document.getElementById(
                'precio'
            ).value,

        precioAnterior:
            document.getElementById(
                'precioAnterior'
            ).value,

        descripcion:
            document.getElementById(
                'descripcion'
            ).value.trim(),

        categoria:
            obtenerListaFormulario(
                'categoria'
            ),

        tags:
            obtenerListaFormulario(
                'tags'
            ),

        badges:
            obtenerListaFormulario(
                'badges'
            ),

        stock:
            document.getElementById(
                'stock'
            ).value,

        talles:
            obtenerListaFormulario(
                'talles'
            ),

        colores:
            obtenerListaFormulario(
                'colores'
            ),

        activo:
            document.getElementById(
                'activo'
            ).checked,

        destacado:
            document.getElementById(
                'destacado'
            ).checked,

        orden:
            document.getElementById(
                'orden'
            ).value
    };
}


// =================================================
// VALIDAR DATOS
// =================================================

function validarDatosFormulario(
    datos,
    esNuevo
) {

    if (!datos.nombre) {

        throw new Error(
            'El nombre del producto es obligatorio.'
        );
    }


    if (
        datos.nombre.length < 2
    ) {

        throw new Error(
            'El nombre del producto es demasiado corto.'
        );
    }


    const precio =
        Number(datos.precio);


    if (
        datos.precio === '' ||
        !Number.isFinite(precio) ||
        precio < 0
    ) {

        throw new Error(
            'El precio de venta debe ser un número válido mayor o igual a 0.'
        );
    }


    if (
        datos.precioCosto !== ''
    ) {

        const precioCosto =
            Number(datos.precioCosto);


        if (
            !Number.isFinite(precioCosto) ||
            precioCosto < 0
        ) {

            throw new Error(
                'El precio de costo debe ser un número válido mayor o igual a 0.'
            );
        }
    }


    if (
        datos.precioAnterior !== ''
    ) {

        const precioAnterior =
            Number(datos.precioAnterior);


        if (
            !Number.isFinite(precioAnterior) ||
            precioAnterior < 0
        ) {

            throw new Error(
                'El precio anterior debe ser un número válido mayor o igual a 0.'
            );
        }
    }


    if (
        datos.stock !== ''
    ) {

        const stock =
            Number(datos.stock);


        if (
            !Number.isInteger(stock) ||
            stock < 0
        ) {

            throw new Error(
                'El stock debe ser un número entero mayor o igual a 0.'
            );
        }
    }


    if (
        datos.orden !== ''
    ) {

        const orden =
            Number(datos.orden);


        if (
            !Number.isInteger(orden) ||
            orden < 0
        ) {

            throw new Error(
                'El orden debe ser un número entero mayor o igual a 0.'
            );
        }
    }


    if (esNuevo) {

        const archivos =
            Array.from(
                fileInput.files
            );


        if (
            archivos.length === 0
        ) {

            throw new Error(
                'Debés seleccionar al menos una imagen.'
            );
        }


        validarArchivosImagen(
            archivos
        );
    }
}


// =================================================
// VALIDAR IMÁGENES
// =================================================

function validarArchivosImagen(
    archivos
) {

    for (
        const archivo of archivos
    ) {

        if (
            !archivo.type ||
            !archivo.type.startsWith(
                'image/'
            )
        ) {

            throw new Error(
                `"${archivo.name}" no es un archivo de imagen válido.`
            );
        }


        if (
            archivo.size === 0
        ) {

            throw new Error(
                `"${archivo.name}" está vacío.`
            );
        }
    }
}


// =================================================
// GUARDAR PRODUCTO
// =================================================

formulario.addEventListener(
    'submit',
    async event => {

        event.preventDefault();


        const autenticado =
            await verificarAutenticacion();


        if (!autenticado) {
            return;
        }


        const index =
            parseInt(
                document.getElementById(
                    'editIndex'
                ).value,
                10
            );


        const datos =
            obtenerDatosFormulario();


        const archivos =
            Array.from(
                fileInput.files
            );


        try {

            validarDatosFormulario(
                datos,
                index === -1
            );


        } catch (error) {

            alert(
                error.message
            );

            return;
        }


        if (
            index !== -1 &&
            archivos.length > 0
        ) {

            try {

                validarArchivosImagen(
                    archivos
                );


            } catch (error) {

                alert(
                    error.message
                );

                return;
            }
        }


        mostrarCargando(
            true,
            'Guardando producto...'
        );


        try {

            if (index === -1) {

                mostrarCargando(
                    true,
                    'Optimizando y subiendo imágenes...'
                );


                await crearProducto(
                    datos,
                    archivos
                );


            } else {

                mostrarCargando(
                    true,
                    archivos.length > 0
                        ? 'Optimizando y subiendo imágenes...'
                        : 'Guardando cambios...'
                );


                await editarProducto(
                    index,
                    datos,
                    archivos
                );
            }


            alert(
                '¡Cambios guardados con éxito!'
            );


            cancelarEdicion();


            await cargarInventario();


        } catch (error) {

            alert(
                'Error: ' +
                error.message
            );


            await manejarErrorSesion(
                error,
                cargarInventario
            );


        } finally {

            mostrarCargando(false);
        }
    }
);


// =================================================
// PREVISUALIZAR NUEVAS IMÁGENES
// =================================================

fileInput.addEventListener(
    'change',
    () => {

        const archivos =
            Array.from(
                fileInput.files
            );


        if (
            archivos.length === 0
        ) {
            return;
        }


        try {

            validarArchivosImagen(
                archivos
            );


        } catch (error) {

            alert(
                error.message
            );


            fileInput.value = '';

            return;
        }


        const index =
            parseInt(
                document.getElementById(
                    'editIndex'
                ).value,
                10
            );


        if (index === -1) {

            mostrarPrevisualizacionArchivos(
                archivos
            );

            return;
        }


        const producto =
            obtenerProductos()[index];


        if (!producto) {
            return;
        }


        renderizarImagenesFormulario(
            producto
        );


        mostrarPrevisualizacionArchivos(
            archivos,
            true
        );
    }
);


// =================================================
// PREVISUALIZACIÓN DE ARCHIVOS
// =================================================

function mostrarPrevisualizacionArchivos(
    archivos,
    agregar = false
) {

    if (!agregar) {
        preview.innerHTML = '';
    }


    archivos.forEach(
        archivo => {

            const reader =
                new FileReader();


            reader.onload =
                event => {

                    const item =
                        document.createElement(
                            'div'
                        );


                    item.className =
                        'imagen-preview-item';


                    const img =
                        document.createElement(
                            'img'
                        );


                    img.src =
                        event.target.result;


                    img.alt =
                        archivo.name;


                    const label =
                        document.createElement(
                            'p'
                        );


                    label.className =
                        'imagen-label';


                    label.textContent =
                        archivo.name;


                    item.appendChild(img);

                    item.appendChild(label);

                    preview.appendChild(item);
                };


            reader.readAsDataURL(
                archivo
            );
        }
    );
}


// =================================================
// EDITAR PRODUCTO
// =================================================

async function iniciarEdicion(index) {

    const autenticado =
        await verificarAutenticacion();


    if (!autenticado) {
        return;
    }


    const producto =
        obtenerProductos()[index];


    if (!producto) {
        return;
    }


    cargarFormulario(
        producto,
        index
    );


    window.scrollTo({

        top: 0,

        behavior: 'smooth'
    });
}


// =================================================
// ELIMINAR PRODUCTO
// =================================================

async function iniciarEliminacion(index) {

    const autenticado =
        await verificarAutenticacion();


    if (!autenticado) {
        return;
    }


    const producto =
        obtenerProductos()[index];


    if (!producto) {
        return;
    }


    if (
        !confirm(
            `¿Deseás eliminar "${producto.nombre}"?`
        )
    ) {
        return;
    }


    mostrarCargando(
        true,
        'Sincronizando eliminación...'
    );


    try {

        await eliminarProducto(
            index
        );


        alert(
            '¡Producto eliminado correctamente!'
        );


        await cargarInventario();


    } catch (error) {

        alert(
            'Error al eliminar: ' +
            error.message
        );


        await manejarErrorSesion(
            error,
            cargarInventario
        );


    } finally {

        mostrarCargando(false);
    }
}


// =================================================
// GESTIÓN DE IMÁGENES
// =================================================

preview.addEventListener(
    'click',
    async event => {

        const boton =
            event.target.closest(
                'button'
            );


        if (!boton) {
            return;
        }


        const autenticado =
            await verificarAutenticacion();


        if (!autenticado) {
            return;
        }


        const indexProducto =
            parseInt(
                document.getElementById(
                    'editIndex'
                ).value,
                10
            );


        if (
            Number.isNaN(
                indexProducto
            ) ||
            indexProducto < 0
        ) {
            return;
        }


        const producto =
            obtenerProductos()[
                indexProducto
            ];


        if (!producto) {
            return;
        }


        let imagenes =
            Array.isArray(
                producto.imagenes
            )
                ? [...producto.imagenes]
                : producto.imagen
                    ? [{
                        url: producto.imagen,
                        alt: producto.nombre,
                        orden: 0
                    }]
                    : [];


        const indexImagen =
            parseInt(
                boton.dataset.imagenIndex,
                10
            );


        if (
            Number.isNaN(indexImagen) ||
            indexImagen < 0 ||
            indexImagen >= imagenes.length
        ) {
            return;
        }


        // HACER PRINCIPAL

        if (
            boton.classList.contains(
                'btn-imagen-principal'
            )
        ) {

            const imagenPrincipal =
                imagenes[indexImagen].url;


            await guardarOrdenImagenes(
                indexProducto,
                imagenes,
                imagenPrincipal,
                'Guardando imagen principal...'
            );


            return;
        }


        // SUBIR

        if (
            boton.classList.contains(
                'btn-subir-imagen'
            )
        ) {

            if (
                indexImagen === 0
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


            actualizarOrdenLocal(
                imagenes
            );


            await guardarOrdenImagenes(
                indexProducto,
                imagenes,
                producto.imagenPrincipal,
                'Reordenando imágenes...'
            );


            return;
        }


        // BAJAR

        if (
            boton.classList.contains(
                'btn-bajar-imagen'
            )
        ) {

            if (
                indexImagen >=
                imagenes.length - 1
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


            actualizarOrdenLocal(
                imagenes
            );


            await guardarOrdenImagenes(
                indexProducto,
                imagenes,
                producto.imagenPrincipal,
                'Reordenando imágenes...'
            );


            return;
        }


        // ELIMINAR

        if (
            boton.classList.contains(
                'btn-eliminar-imagen'
            )
        ) {

            if (
                !confirm(
                    '¿Eliminar esta imagen del producto?'
                )
            ) {
                return;
            }


            const imagenEliminada =
                imagenes[indexImagen];


            imagenes.splice(
                indexImagen,
                1
            );


            actualizarOrdenLocal(
                imagenes
            );


            let imagenPrincipal =
                producto.imagenPrincipal;


            if (
                imagenPrincipal ===
                imagenEliminada.url
            ) {

                imagenPrincipal =
                    imagenes[0]?.url ||
                    '';
            }


            await guardarOrdenImagenes(
                indexProducto,
                imagenes,
                imagenPrincipal,
                'Eliminando imagen...'
            );
        }
    }
);


// =================================================
// ACTUALIZAR ORDEN
// =================================================

function actualizarOrdenLocal(
    imagenes
) {

    imagenes.forEach(
        (imagen, index) => {

            imagen.orden =
                index;
        }
    );
}


// =================================================
// GUARDAR CAMBIOS DE IMÁGENES
// =================================================

async function guardarOrdenImagenes(
    indexProducto,
    imagenes,
    imagenPrincipal,
    mensaje
) {

    mostrarCargando(
        true,
        mensaje
    );


    try {

        actualizarOrdenLocal(
            imagenes
        );


        await actualizarImagenes(
            indexProducto,
            imagenes,
            imagenPrincipal
        );


        const productoActualizado =
            obtenerProductos()[
                indexProducto
            ];


        renderizarImagenesFormulario(
            productoActualizado
        );


        renderizarTabla(
            obtenerProductos(),
            iniciarEdicion,
            iniciarEliminacion
        );


    } catch (error) {

        alert(
            'Error al actualizar las imágenes: ' +
            error.message
        );


        await manejarErrorSesion(
            error,
            cargarInventario
        );


    } finally {

        mostrarCargando(false);
    }
}


// =================================================
// CANCELAR
// =================================================

document
    .getElementById('btnCancelar')
    .addEventListener(
        'click',
        cancelarEdicion
    );


// =================================================
// INICIO
// =================================================

async function iniciar() {

    const autenticado =
        await autenticar();


    if (!autenticado) {

        document.body.innerHTML =
            '<h2>Acceso denegado.</h2>';

        return;
    }


    await cargarInventario();
}


iniciar();
