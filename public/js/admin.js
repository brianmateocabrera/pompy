import {
    cargarProductos,
    obtenerProductos,
    crearProducto,
    editarProducto,
    eliminarProducto,
    actualizarImagenes
} from './productos.js';

import {
    autenticarAdministrador,
    cerrarSesion,
    administradorAutenticado
} from './api.js';

import {
    mostrarCargando,
    renderizarTabla,
    cargarFormulario,
    renderizarImagenesFormulario,
    cancelarEdicion
} from './ui.js';


const formulario =
    document.getElementById('prodForm');

const fileInput =
    document.getElementById('imagenFile');

const preview =
    document.getElementById('imagenesPreview');


/* ------------------------------------------
   AUTENTICACIÓN
------------------------------------------ */

async function autenticar() {

    const sesionValida =
        await administradorAutenticado();

    if (sesionValida) {
        return true;
    }


    const password =
        prompt(
            'Ingresá la contraseña de administrador:'
        );


    if (password === null) {
        return false;
    }


    if (password === '') {

        alert(
            'Debés ingresar una contraseña.'
        );

        return false;
    }


    mostrarCargando(
        true,
        'Autenticando...'
    );


    try {

        const resultado =
            await autenticarAdministrador(
                password
            );


        if (!resultado.success) {

            alert(
                resultado.error ||
                'Contraseña incorrecta.'
            );

            return false;
        }


        return true;


    } catch (error) {

        alert(
            'Error de autenticación: ' +
            error.message
        );

        return false;


    } finally {

        mostrarCargando(false);
    }
}


/* ------------------------------------------
   VERIFICAR SESIÓN
------------------------------------------ */

async function verificarAutenticacion() {

    const autenticado =
        await administradorAutenticado();


    if (autenticado) {
        return true;
    }


    return await autenticar();
}


/* ------------------------------------------
   CARGAR INVENTARIO
------------------------------------------ */

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

        const mensaje =
            String(
                error.message || ''
            ).toLowerCase();


        if (
            mensaje.includes('401') ||
            mensaje.includes('sesión') ||
            mensaje.includes('autentic')
        ) {

            await cerrarSesion();


            const autenticado =
                await autenticar();


            if (autenticado) {

                await cargarInventario();

            } else {

                document.body.innerHTML =
                    '<h2>Acceso denegado.</h2>';
            }


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


/* ------------------------------------------
   OBTENER DATOS DEL FORMULARIO
------------------------------------------ */

function obtenerDatosFormulario() {

    return {

        sku:
            document.getElementById('sku').value,

        nombre:
            document.getElementById('nombre').value,

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
            ).value,

        categoria:
            document.getElementById(
                'categoria'
            ).value,

        tags:
            document.getElementById(
                'tags'
            ).value,

        badges:
            document.getElementById(
                'badges'
            ).value,

        stock:
            document.getElementById(
                'stock'
            ).value,

        talles:
            document.getElementById(
                'talles'
            ).value,

        colores:
            document.getElementById(
                'colores'
            ).value,

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


/* ------------------------------------------
   GUARDAR PRODUCTO
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


        mostrarCargando(
            true,
            'Guardando producto...'
        );


        try {

            if (index === -1) {

                if (
                    archivos.length === 0
                ) {

                    throw new Error(
                        'Debes seleccionar al menos una imagen.'
                    );
                }


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
                error
            );


        } finally {

            mostrarCargando(false);
        }
    }
);


/* ------------------------------------------
   PREVISUALIZAR NUEVAS IMÁGENES
------------------------------------------ */

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


/* ------------------------------------------
   PREVISUALIZACIÓN DE ARCHIVOS NUEVOS
------------------------------------------ */

function mostrarPrevisualizacionArchivos(
    archivos,
    agregar = false
) {

    if (!agregar) {
        preview.innerHTML = '';
    }


    archivos.forEach(
        archivo => {

            if (
                !archivo.type.startsWith(
                    'image/'
                )
            ) {
                return;
            }


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


/* ------------------------------------------
   EDITAR PRODUCTO
------------------------------------------ */

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


/* ------------------------------------------
   ELIMINAR PRODUCTO
------------------------------------------ */

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
            `¿Deseas eliminar "${producto.nombre}"?`
        )
    ) {
        return;
    }


    mostrarCargando(
        true,
        'Sincronizando eliminación...'
    );


    try {

        await eliminarProducto(index);


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
            error
        );


    } finally {

        mostrarCargando(false);
    }
}


/* ------------------------------------------
   GESTIÓN DE IMÁGENES
------------------------------------------ */

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


        /* HACER PRINCIPAL */

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


        /* SUBIR */

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


        /* BAJAR */

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


        /* ELIMINAR */

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


/* ------------------------------------------
   ACTUALIZAR ORDEN
------------------------------------------ */

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


/* ------------------------------------------
   GUARDAR CAMBIOS DE IMÁGENES
------------------------------------------ */

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
            error
        );


    } finally {

        mostrarCargando(false);
    }
}


/* ------------------------------------------
   MANEJO DE SESIÓN EXPIRADA
------------------------------------------ */

async function manejarErrorSesion(
    error
) {

    const mensaje =
        String(
            error?.message || ''
        ).toLowerCase();


    if (
        mensaje.includes('401') ||
        mensaje.includes('sesión') ||
        mensaje.includes('autentic')
    ) {

        await cerrarSesion();


        const autenticado =
            await autenticar();


        if (autenticado) {

            await cargarInventario();

        } else {

            document.body.innerHTML =
                '<h2>Acceso denegado.</h2>';
        }

        return true;
    }


    return false;
}


/* ------------------------------------------
   CANCELAR
------------------------------------------ */

document
    .getElementById('btnCancelar')
    .addEventListener(
        'click',
        cancelarEdicion
    );


/* ------------------------------------------
   INICIO
------------------------------------------ */

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
