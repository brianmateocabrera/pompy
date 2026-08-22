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

    if (!json.success) {
        throw new Error(
            json.error ||
            'No se pudo cargar el inventario.'
        );
    }

    shaActualJson = json.sha;
    listaProductos = Array.isArray(json.data)
        ? json.data
        : [];

    return listaProductos;
}


/* ------------------------------------------
   UTILIDADES
------------------------------------------ */

function generarId() {

    return 'prod-' +
        Date.now().toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .substring(2, 8);
}


function generarSlug(nombre) {

    return String(nombre || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}


function obtenerFechaActual() {
    return new Date().toISOString();
}


function convertirLista(texto) {

    if (!texto) {
        return [];
    }

    return String(texto)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}


/* ------------------------------------------
   IMÁGENES
------------------------------------------ */

async function subirImagen(dataUrl, nombreOriginal) {

    const partes = dataUrl.split(',');

    if (partes.length < 2) {
        throw new Error(
            'Formato de imagen inválido.'
        );
    }

    const base64Puro = partes[1];


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
            message:
                `Subir imagen: ${nombreArchivoWebP}`,

            content: base64Puro
        }
    );


    if (!json.success) {
        throw new Error(
            'Error al guardar la imagen en GitHub: ' +
            (json.error || 'Error desconocido.')
        );
    }


    return rutaImagen.replace(
        'public/',
        '/'
    );
}


/* ------------------------------------------
   GUARDAR JSON
------------------------------------------ */

async function guardarCambiosJSON(
    mensajeCommit
) {

    const json = await llamarAPI(
        'PUT',
        PATH_JSON,
        {
            message: mensajeCommit,

            content:
                JSON.stringify(
                    listaProductos,
                    null,
                    2
                ),

            sha:
                shaActualJson ||
                undefined
        }
    );


    if (json.success) {

        if (json.sha) {
            shaActualJson = json.sha;
        }

        return {
            success: true
        };
    }


    if (
        json.error &&
        json.error
            .toLowerCase()
            .includes('sha')
    ) {

        await cargarProductos();

        return {
            success: false,
            conflict: true,
            error:
                'El catálogo fue modificado desde otro dispositivo.'
        };
    }


    return {
        success: false,
        error:
            json.error ||
            'Error al actualizar el catálogo.'
    };
}


/* ------------------------------------------
   NORMALIZAR PRODUCTO
------------------------------------------ */

function normalizarProducto(
    datos,
    imagenes,
    imagenPrincipal,
    productoAnterior = null
) {

    const ahora =
        obtenerFechaActual();


    const id =
        productoAnterior?.id ||
        generarId();


    const slug =
        generarSlug(datos.nombre);


    return {

        id,

        sku:
            String(datos.sku || '').trim(),

        slug,

        nombre:
            String(datos.nombre || '').trim(),

        descripcion:
            String(
                datos.descripcion || ''
            ).trim(),

        precioCosto:
            Number(datos.precioCosto) || 0,

        precio:
            Number(datos.precio) || 0,

        precioAnterior:
            datos.precioAnterior === '' ||
            datos.precioAnterior === null ||
            datos.precioAnterior === undefined
                ? null
                : Number(datos.precioAnterior),

        imagenes:

            imagenes.map(
                (imagen, index) => ({
                    url: imagen.url,
                    alt:
                        imagen.alt ||
                        datos.nombre,

                    orden: index
                })
            ),

        imagenPrincipal:
            imagenPrincipal || '',

        categoria:
            convertirLista(
                datos.categoria
            ),

        tags:
            convertirLista(
                datos.tags
            ),

        badges:
            convertirLista(
                datos.badges
            ),

        stock:
            Number(datos.stock) || 0,

        talles:
            convertirLista(
                datos.talles
            ),

        colores:
            convertirLista(
                datos.colores
            ),

        activo:
            datos.activo !== false,

        destacado:
            datos.destacado === true,

        orden:
            Number(datos.orden) || 0,

        fechaCreacion:
            productoAnterior?.fechaCreacion ||
            ahora,

        fechaActualizacion:
            ahora
    };
}


/* ------------------------------------------
   CREAR PRODUCTO
------------------------------------------ */

export async function crearProducto(
    datos,
    archivosImagen
) {

    if (
        !archivosImagen ||
        archivosImagen.length === 0
    ) {
        throw new Error(
            'Debes seleccionar al menos una imagen.'
        );
    }


    const imagenes = [];


    for (
        const archivo of archivosImagen
    ) {

        const imagenWebP =
            await optimizarImagen(
                archivo
            );


        const url =
            await subirImagen(
                imagenWebP,
                archivo.name
            );


        imagenes.push({
            url,
            alt: datos.nombre,
            orden: imagenes.length
        });
    }


    const producto =
        normalizarProducto(
            datos,
            imagenes,
            imagenes[0]?.url || ''
        );


    listaProductos.push(producto);


    const resultado =
        await guardarCambiosJSON(
            `Crear producto: ${producto.nombre}`
        );


    if (!resultado.success) {

        throw new Error(
            resultado.error
        );
    }


    return producto;
}


/* ------------------------------------------
   EDITAR PRODUCTO
------------------------------------------ */

export async function editarProducto(
    index,
    datos,
    archivosImagen
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


    const imagenes =
        Array.isArray(
            productoAnterior.imagenes
        )
            ? [...productoAnterior.imagenes]
            : [];


    const archivos =
        archivosImagen || [];


    for (
        const archivo of archivos
    ) {

        const imagenWebP =
            await optimizarImagen(
                archivo
            );


        const url =
            await subirImagen(
                imagenWebP,
                archivo.name
            );


        imagenes.push({
            url,
            alt: datos.nombre,
            orden: imagenes.length
        });
    }


    let imagenPrincipal =
        productoAnterior.imagenPrincipal ||
        imagenes[0]?.url ||
        '';


    if (
        !imagenes.some(
            imagen =>
                imagen.url === imagenPrincipal
        )
    ) {
        imagenPrincipal =
            imagenes[0]?.url || '';
    }


    const productoActualizado =
        normalizarProducto(
            datos,
            imagenes,
            imagenPrincipal,
            productoAnterior
        );


    listaProductos[index] =
        productoActualizado;


    const resultado =
        await guardarCambiosJSON(
            `Actualizar producto: ${productoActualizado.nombre}`
        );


    if (!resultado.success) {

        throw new Error(
            resultado.error
        );
    }


    return productoActualizado;
}


/* ------------------------------------------
   ACTUALIZAR IMÁGENES
------------------------------------------ */

export async function actualizarImagenes(
    index,
    imagenes,
    imagenPrincipal
) {

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


    const nuevasImagenes =
        imagenes.map(
            (imagen, posicion) => ({
                url: imagen.url,
                alt:
                    imagen.alt ||
                    producto.nombre,

                orden: posicion
            })
        );


    producto.imagenes =
        nuevasImagenes;


    producto.imagenPrincipal =
        imagenPrincipal ||
        nuevasImagenes[0]?.url ||
        '';


    producto.fechaActualizacion =
        obtenerFechaActual();


    const resultado =
        await guardarCambiosJSON(
            `Actualizar imágenes: ${producto.nombre}`
        );


    if (!resultado.success) {

        throw new Error(
            resultado.error
        );
    }


    return producto;
}


/* ------------------------------------------
   ELIMINAR PRODUCTO
------------------------------------------ */

export async function eliminarProducto(
    index
) {

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


    listaProductos.splice(
        index,
        1
    );


    const resultado =
        await guardarCambiosJSON(
            `Eliminar producto: ${producto.nombre}`
        );


    if (!resultado.success) {

        throw new Error(
            resultado.error
        );
    }


    return producto;
}
