import { llamarAPI } from './api.js';
import { optimizarImagen } from './imageOptimizer.js';

const PATH_JSON = 'data/productos.json';

let shaActualJson = '';
let listaProductos = [];


export function obtenerProductos() {
    return listaProductos;
}


export async function cargarProductos() {

    const json = await llamarAPI('GET', PATH_JSON);

    if (json.success) {
        shaActualJson = json.sha;
        listaProductos = json.data || [];
    } else {
        shaActualJson = '';
        listaProductos = [];
    }

    return listaProductos;
}


async function subirImagen(dataUrl, nombreOriginal) {

    const base64Puro = dataUrl.split(',')[1];

    const nombreLimpio =
        nombreOriginal
            .toLowerCase()
            .split('.')[0]
            .replace(/[^a-z0-9]/gi, '_');

    const nombreArchivoWebP =
        `${Date.now()}-${nombreLimpio}.webp`;

    const rutaImagen =
        `public/imagenes/${nombreArchivoWebP}`;


    const json = await llamarAPI(
        'PUT',
        rutaImagen,
        {
            message: `Subir imagen: ${nombreArchivoWebP}`,
            content: base64Puro
        }
    );


    if (!json.success) {
        throw new Error(
            'Error al guardar la imagen en GitHub: ' +
            json.error
        );
    }


    return rutaImagen.replace('public/', '/');
}


async function guardarCambiosJSON(mensajeCommit) {

    const json = await llamarAPI(
        'PUT',
        PATH_JSON,
        {
            message: mensajeCommit,
            content: JSON.stringify(
                listaProductos,
                null,
                2
            ),
            sha: shaActualJson || undefined
        }
    );


    if (json.success) {
        shaActualJson = json.sha;
        return {
            success: true
        };
    }


    if (
        json.error &&
        json.error.toLowerCase().includes('sha')
    ) {

        await cargarProductos();

        return {
            success: false,
            conflict: true,
            error: 'El catálogo fue modificado desde otro dispositivo.'
        };
    }


    return {
        success: false,
        error:
            json.error ||
            'Error al actualizar el catálogo.'
    };
}


export async function crearProducto(
    datos,
    archivoImagen
) {

    let urlImagen = '';


    if (!archivoImagen) {
        throw new Error(
            'Debes seleccionar una imagen para el nuevo producto.'
        );
    }


    const imagenWebP =
        await optimizarImagen(archivoImagen);


    urlImagen =
        await subirImagen(
            imagenWebP,
            archivoImagen.name
        );


    const producto = {
        nombre: datos.nombre,
        precio: datos.precio,
        imagen: urlImagen,
        descripcion: datos.descripcion
    };


    listaProductos.push(producto);


    const resultado =
        await guardarCambiosJSON(
            `Crear producto: ${producto.nombre}`
        );


    if (!resultado.success) {

        if (resultado.conflict) {
            listaProductos =
                listaProductos.filter(
                    productoActual =>
                        productoActual !== producto
                );
        }

        throw new Error(resultado.error);
    }


    return producto;
}


export async function editarProducto(
    index,
    datos,
    archivoImagen
) {

    if (
        index < 0 ||
        index >= listaProductos.length
    ) {
        throw new Error(
            'Producto no encontrado.'
        );
    }


    const productoAnterior =
        listaProductos[index];


    let urlImagen =
        productoAnterior.imagen;


    if (archivoImagen) {

        const imagenWebP =
            await optimizarImagen(
                archivoImagen
            );


        urlImagen =
            await subirImagen(
                imagenWebP,
                archivoImagen.name
            );
    }


    const productoActualizado = {
        nombre: datos.nombre,
        precio: datos.precio,
        imagen: urlImagen,
        descripcion: datos.descripcion
    };


    listaProductos[index] =
        productoActualizado;


    const resultado =
        await guardarCambiosJSON(
            `Actualizar producto: ${productoActualizado.nombre}`
        );


    if (!resultado.success) {
        throw new Error(resultado.error);
    }


    return productoActualizado;
}


export async function eliminarProducto(index) {

    if (
        index < 0 ||
        index >= listaProductos.length
    ) {
        throw new Error(
            'Producto no encontrado.'
        );
    }


    const producto =
        listaProductos[index];


    listaProductos.splice(index, 1);


    const resultado =
        await guardarCambiosJSON(
            `Eliminar producto: ${producto.nombre}`
        );


    if (!resultado.success) {
        throw new Error(resultado.error);
    }


    return producto;
}
