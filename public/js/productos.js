import {
    cargarProductosDesdeAPI,
    guardarProductos
} from './productos-persistencia.js';

import {
    procesarImagen
} from './productos-imagenes.js';


let listaProductos = [];


/* ------------------------------------------
   OBTENER PRODUCTOS
------------------------------------------ */

export function obtenerProductos() {

    return listaProductos;
}


/* ------------------------------------------
   CARGAR PRODUCTOS
------------------------------------------ */

export async function cargarProductos() {

    listaProductos =
        await cargarProductosDesdeAPI();

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
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .replace(
            /[^a-z0-9]+/g,
            '-'
        )
        .replace(
            /^-+|-+$/g,
            '');
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
        .map(
            item => item.trim()
        )
        .filter(Boolean);
}


/* ------------------------------------------
   VALIDACIÓN
------------------------------------------ */

function validarProducto(
    datos,
    indexActual = -1
) {

    const nombre =
        String(
            datos.nombre || ''
        ).trim();


    if (!nombre) {

        throw new Error(
            'El nombre del producto es obligatorio.'
        );
    }


    if (
        nombre.length < 2
    ) {

        throw new Error(
            'El nombre del producto debe tener al
 menos 2 caracteres.'
        );
    }


    const precio =
        Number(datos.precio);


    if (
        !Number.isFinite(precio) ||
        precio < 0
    ) {

        throw new Error(
            'El precio de venta no es válido.'
        );
    }


    if (
        datos.precioCosto !== '' &&
        datos.precioCosto !== undefined &&
        datos.precioCosto !== null
    ) {

        const precioCosto =
            Number(datos.precioCosto);


        if (
            !Number.isFinite(precioCosto) ||
            precioCosto < 0
        ) {

            throw new Error(
                'El precio de costo no es válido.'
            );
        }
    }


    if (
        datos.precioAnterior !== '' &&
        datos.precioAnterior !== undefined &&
        datos.precioAnterior !== null
    ) {

        const precioAnterior =
            Number(datos.precioAnterior);


        if (
            !Number.isFinite(precioAnterior) ||
            precioAnterior < 0
        ) {

            throw new Error(
                'El precio anterior no es válido.'
            );
        }
    }


    if (
        datos.stock !== '' &&
        datos.stock !== undefined &&
        datos.stock !== null
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
        datos.orden !== '' &&
        datos.orden !== undefined &&
        datos.orden !== null
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


    const sku =
        String(
            datos.sku || ''
        )
            .trim()
            .toLowerC
ase();


    if (sku) {

        const duplicado =
            listaProductos.some(
                (
                    producto,
                    index
                ) =>
                    index !== indexActual &&
                    String(
                        producto.sku || ''
                    )
                        .trim()
                        .toLowerCase() === sku
            );


        if (duplicado) {

            throw new Error(
                `El SKU "${datos.sku}" ya está asignado a otro producto.`
            );
        }
    }
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
        generarSlug(
            datos.nombre
        );


    return {

        id,

        sku:
            String(
                datos.sku || ''
            ).trim(),

        slug,

        nombre:
            String(
                datos.nombre || ''
            ).trim(),

        descripcion:
            String(
                datos.descripcion || ''
            ).trim(),

        precioCosto:
            Number(
                datos.precioCosto
            ) || 0,

        precio:
            Number(
                datos.precio
            ) || 0,

        precioAnterior:
            datos.precioAnterior === '' ||
            datos.precioAnterior === null ||
            datos.precioAnterior === undefined
                ? null
                : Number(
                    datos.precioAnterior
                ),

        imagenes:
            imagenes.map(
                (
                    imagen,
                    index
                ) => ({

                    url:
                        imagen.url,

                    alt:
                        imagen.alt ||
                        datos.nombre,

                    orden:
                        index
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
            Number(
                datos.stock
            ) || 0,

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
            Number(
                datos.orden
            ) || 0,

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

    validarProducto(
        datos
    );


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

        const url =
            await procesarImagen(
                archivo
            );


        imagenes.push({

            url,

            alt:
                datos.nombre,

            orden:
                imagenes.length
        });
    }


    const producto =
        normalizarProducto(
            datos,
            imagenes,
            imagenes[0]?.url || ''
        );


    listaProductos.push(
        producto
    );


    const resultado =
        await guardarProductos(
            listaProductos,
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


    validarProducto(
        datos,
        index
    );


    const productoAnterior =
        listaProductos[index];


    const imagenes =
        Array.isArray(
            productoAnterior.imagenes
        )
            ? [
                ...productoAnterior.imagenes
            ]
            : [];


    const archivos =
        archivosImagen || [];


    for (
        const archivo of archivos
    ) {

        const url =
            await procesarImagen(
                archivo
            );


        imagenes.push({

            url,

            alt:
                datos.nombre,

            orden:
                imagenes.length
        });
    }


    let imagenPrincipal =
        productoAnterior.imagenPrincipal ||
        imagenes[0]?.url ||
        '';


    if (
        !imagenes.some(
            imagen =>
                imagen.url ===
                imagenPrincipal
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
        await guardarProductos(
            listaProductos,
            `Actualizar
 producto: ${productoActualizado.nombre}`
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
            (
                imagen,
                posicion
            ) => ({

                url:
                    imagen.url,

                alt:
                    imagen.alt ||
                    producto.nombre,

                orden:
                    posicion
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
        await guardarProductos(
            listaProductos,
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
        await guardarProductos(
            listaProductos,

            `Eliminar producto: ${producto.nombre}`
        );


    if (!resultado.success) {

        throw new Error(
            resultado.error
        );
    }


    return producto;
}
