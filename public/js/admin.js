import {
    cargarProductos,
    obtenerProductos,
    crearProducto,
    editarProducto,
    eliminarProducto
} from './productos.js';

import {
    cerrarSesion
} from './api.js';

import {
    mostrarCargando,
    renderizarTabla,
    cargarFormulario,
    cancelarEdicion,
    obtenerListaFormulario
} from './ui.js';

import {
    autenticar,
    verificarAutenticacion,
    manejarErrorSesion
} from './admin-auth.js';

import {
    configurarPrevisualizacion,
    configurarGestionImagenes,
    validarArchivosImagen
} from './admin-imagenes.js';


const formulario =
    document.getElementById('prodForm');

const fileInput =
    document.getElementById('imagenFile');


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
// GUARDAR PRODUCTO
// =================================================

formulario.addEventListener(
    'submit',
    async event => {

        event.preventDefault();

        const autenticado =
            await verificarAutenticacion();

        if (!
autenticado) {
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

    alert('PASO 1: admin.js se está ejecutando');

    const autenticado =
        await autenticar();

    alert('PASO 2: autenticar() terminó. Resultado: ' + autenticado);

    if (!autenticado) {

        document.body.innerHTML =
            '<h2>Acceso denegado.</h2>';

        return;
    }

    configurarPrevisualizacion();

    configurarGestionImagenes(
        verificarAutenticacion,
        manejarErrorSesion,
        renderizarTabla,
        iniciarEdicion,
        iniciarEliminacion
    );

    alert('PASO 3: voy a cargar el inventario');

await cargarInventario();

alert('PASO 4: cargarInventario() terminó');
}


iniciar();