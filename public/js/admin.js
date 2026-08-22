import {
    cargarProductos,
    obtenerProductos,
    crearProducto,
    editarProducto,
    eliminarProducto,
    actualizarImagenes
} from './productos.js';

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

        alert(
            'Error al conectar con la base de datos: ' +
            error.message
        );

    } finally {

        mostrarCargando(false);
    }
}


/* ------------------------------------------
   DATOS DEL FORMULARIO
------------------------------------------ */

function obtenerDatosFormulario() {

    return {

        sku:
            document.getElementById('sku').value,

        nombre:
            document.getElementById('nombre').value,

        precioCosto:
            document.getElementById('precioCosto').value,

        precio:
            document.getElementById('precio').value,

        precioAnterior:
            document.getElementById('precioAnterior').value,

        descripcion:
            document.getElementById('descripcion').value,

        categoria:
            document.getElementById('categoria').value,

        tags:
            document.getElementById('tags').value,

        badges:
            document.getElementById('badges').value,

        stock:
            document.getElementById('stock').value,

        talles:
            document.getElementById('talles').value,

        colores:
            document.getElementById('colores').value,

        activo:
            document.getElementById('activo').checked,

        destacado:
            document.getElementById('destacado').checked,

        orden:
            document.getElementById('orden').value
    };
}


/* ------------------------------------------
   SUBMIT
------------------------------------------ */

formulario.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

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

                if (archivos.length === 0) {

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
                    archivos.length
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

            await cargarInventario();


        } finally {

            mostrarCargando(false);
        }
    }
);


/* ------------------------------------------
   SELECCIÓN DE IMÁGENES
------------------------------------------ */

fileInput.addEventListener(
    'change',
    () => {

        const archivos =
            Array.from(
                fileInput.files
            );


        if (!archivos.length) {
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

        } else {

            mostrarCargando(
                true,
                'Preparando imágenes...'
            );


            const producto =
                obtenerProductos()[index];


            renderizarImagenesFormulario(
                producto
            );


            mostrarPrevisualizacionArchivos(
                archivos,
                true
            );


            mostrarCargando(
                false
            );
        }
    }
);


/* ------------------------------------------
   PREVISUALIZAR ARCHIVOS NUEVOS
------------------------------------------ */

function mostrarPrevisualizacionArchivos(
    archivos,
    agregar = false
) {

    if (!agregar) {
        preview.innerHTML = '';
    }


    archivos.forEach(
        (archivo) => {

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
                (event) => {

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

function iniciarEdicion(index) {

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


        await cargarInventario();


    } finally {

        mostrarCargando(false);
    }
}


/* ------------------------------------------
   IMÁGENES EXISTENTES
------------------------------------------ */

preview.addEventListener(
    'click',
    async (event) => {

        const boton =
            event.target.closest(
                'button'
            );


        if (!boton) {
            return;
        }


        const indexProducto =
            parseInt(
                document.getElementById(
                    'editIndex'
                ).value,
                10
            );


        if (indexProducto < 0) {
            return;
        }


        const productos =
            obtenerProductos();


        const producto =
            productos[indexProducto];


        if (!producto) {
            return;
        }


        const imagenes =
            Array.isArray(
                producto.imagenes
            )
                ? [...producto.imagenes]
                : [];


        const indexImagen =
            parseInt(
                boton.dataset.imagenIndex,
                10
            );


        if (
            indexImagen < 0 ||
            indexImagen >= imagenes.length
        ) {
            return;
        }


        /* Hacer principal */

        if (
            boton.classList.contains(
                'btn-imagen-principal'
            )
        ) {

            const imagenPrincipal =
                imagenes[indexImagen].url;


            mostrarCargando(
                true,
                'Guardando imagen principal...'
            );


            try {

                await actualizarImagenes(
                    indexProducto,
                    imagenes,
                    imagenPrincipal
                );


                renderizarImagenesFormulario(
                    obtenerProductos()[
                        indexProducto
                    ]
                );


            } catch (error) {

                alert(
                    'Error: ' +
                    error.message
                );

            } finally {

                mostrarCargando(false);
            }


            return;
        }


        /* Eliminar imagen */

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


            imagenes.splice(
                indexImagen,
                1
            );


            let imagenPrincipal =
                producto.imagenPrincipal;


            if (
                imagenPrincipal ===
                producto.imagenes[
                    indexImagen
                ]?.url
            ) {

                imagenPrincipal =
                    imagenes[0]?.url ||
                    '';
            }


            mostrarCargando(
                true,
                'Actualizando imágenes...'
            );


            try {

                await actualizarImagenes(
                    indexProducto,
                    imagenes,
                    imagenPrincipal
                );


                renderizarImagenesFormulario(
                    obtenerProductos()[
                        indexProducto
                    ]
                );


            } catch (error) {

                alert(
                    'Error: ' +
                    error.message
                );

            } finally {

                mostrarCargando(false);
            }
        }
    }
);


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

cargarInventario();
