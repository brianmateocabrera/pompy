import {
    cargarProductos,
    obtenerProductos,
    crearProducto,
    editarProducto,
    eliminarProducto
} from './productos.js';

import {
    mostrarCargando,
    renderizarTabla,
    cargarFormulario,
    cancelarEdicion
} from './ui.js';


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

        alert(
            'Error al conectar con la base de datos: ' +
            error.message
        );

    } finally {

        mostrarCargando(false);

    }
}



document
    .getElementById('prodForm')
    .addEventListener(
        'submit',
        async (e) => {

            e.preventDefault();


            mostrarCargando(
                true,
                'Iniciando proceso...'
            );


            const index =
                parseInt(
                    document
                        .getElementById('editIndex')
                        .value
                );


            const fileInput =
                document.getElementById(
                    'imagenFile'
                );


            const datos = {

                nombre:
                    document
                        .getElementById('nombre')
                        .value,

                precio:
                    parseFloat(
                        document
                            .getElementById('precio')
                            .value
                    ),

                descripcion:
                    document
                        .getElementById('descripcion')
                        .value

            };


            try {

                if (index === -1) {

                    if (!fileInput.files.length) {

                        alert(
                            'Debes seleccionar una imagen para el nuevo producto.'
                        );

                        return;
                    }


                    mostrarCargando(
                        true,
                        'Optimizando imagen...'
                    );


                    await crearProducto(
                        datos,
                        fileInput.files[0]
                    );


                } else {

                    if (fileInput.files.length) {

                        mostrarCargando(
                            true,
                            'Optimizando imagen...'
                        );

                    }


                    await editarProducto(
                        index,
                        datos,
                        fileInput.files[0] || null
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


                await cargarInventario();

            } finally {

                mostrarCargando(false);

            }

        }
    );



async function iniciarEdicion(index) {

    const productos =
        obtenerProductos();


    if (
        index < 0 ||
        index >= productos.length
    ) {
        return;
    }


    cargarFormulario(
        productos[index],
        index
    );

}



async function iniciarEliminacion(index) {

    const productos =
        obtenerProductos();


    if (
        index < 0 ||
        index >= productos.length
    ) {
        return;
    }


    const producto =
        productos[index];


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


        await cargarInventario();

    } finally {

        mostrarCargando(false);

    }

}



document
    .getElementById('btnCancelar')
    .addEventListener(
        'click',
        cancelarEdicion
    );



cargarInventario();
