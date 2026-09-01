/* ------------------------------------------
   INDEX.JS
   Orquestador principal del catálogo público
   Importa de index-tarjetas, index-destacados e index-banners
------------------------------------------ */

import {
    crearTarjeta,
    activarTarjetas,
    activarGalerias
} from './index-tarjetas.js';

import {
    renderizarDestacados
} from './index-destacados.js';

import {
    cargarBanners,
    configurarIndicadoresBanners
} from './index-banners.js';

const API_URL = '/api/crud';
const PATH_PRODUCTOS = 'data/productos.json';

let productos = [];

const catalogo =
    document.getElementById('catalogo');

const busqueda =
    document.getElementById('busqueda');

const categoria =
    document.getElementById('categoria');

const disponibilidad =
    document.getElementById('disponibilidad');

const ordenamiento =
    document.getElementById('ordenamiento');

const resultadoInfo =
    document.getElementById('resultadoInfo');

const banners =
    document.getElementById('banners');

const destacados =
    document.getElementById('destacados');

async function cargar() {

    try {

        const respuesta =
            await fetch(
                API_URL,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringi
fy({
                            action: 'GET',
                            path: PATH_PRODUCTOS
                        })
                }
            );


        const json =
            await respuesta.json();


        if (
            !respuesta.ok ||
            !json.success ||
            !Array.isArray(json.data)
        ) {

            throw new Error(
                json.error ||
                'No se pudo cargar el catálogo.'
            );
        }


        productos =
            json.data.filter(
                producto =>
                    producto.activo !== false
            );


        cargarCategorias();

renderizar();

renderizarDestacados(productos, destacados);


    } catch (error) {

        console.error(
            'Error cargando catálogo:',
            error
        );


        resultadoInfo.textContent = '';


        catalogo.innerHTML = `
            <div class="error">
                Error al cargar el catálogo.
            </div>
        `;
    }
}


/* ------------------------------------------
   CATEGORÍAS
------------------------------------------ */

function cargarCategorias() {

    const categorias =
        new Set();


    productos.forEach(
        producto => {

            if (
                !Array.isArray(
                    producto.categoria
                )
            ) {
                return;
            }


            producto.categoria.forEach(
                nombre => {

                    if (nombre) {
                        categorias.add(
                            nombre
                        );
                    }
                }
            );
        }
    );


    const lista =
        [...categorias].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    'es'
                )
        );


    categoria.innerHTML =
        '<option value="">Todas las categorías</option>' +
        lista
            .map(
                nombre => `
           
         <option value="${escaparHTML(nombre)}">
                        ${escaparHTML(nombre)}
                    </option>
                `
            )
            .join('');
}


/* ------------------------------------------
   FILTRAR Y ORDENAR
------------------------------------------ */

function obtenerProductosFiltrados() {

    const texto =
        busqueda.value
            .trim()
            .toLowerCase();


    const categoriaSeleccionada =
        categoria.value;


    const disponibilidadSeleccionada =
        disponibilidad.value;


    let resultado =
        productos.filter(
            producto => {

                const textoProducto = [
                    producto.nombre,
                    producto.descripcion,
                    ...(producto.tags || []),
                    ...(producto.categoria || [])
                ]
                    .join(' ')
                    .toLowerCase();


                if (
                    texto &&
                    !textoProducto.includes(
                        texto
                    )
                ) {
                    return false;
                }


                if (
                    categoriaSeleccionada &&
                    !(
                        Array.isArray(
                            producto.categoria
                        ) &&
                        producto.categoria.includes(
                            categoriaSeleccionada
                        )
                    )
                ) {
                    return false;
                }


                const stock =
                    Number(
                        producto.stock
                    ) || 0;


                if (
                    disponibilidadSeleccionada ===
                    'disponible' &&
                    stock <= 0
                ) {
                    return false;
                }


                if (
                    disponibilidadSeleccionada ===
 
                   'agotado' &&
                    stock > 0
                ) {
                    return false;
                }


                return true;
            }
        );


    switch (
        ordenamiento.value
    ) {

        case 'precio-menor':

            resultado.sort(
                (a, b) =>
                    Number(a.precio) -
                    Number(b.precio)
            );

            break;


        case 'precio-mayor':

            resultado.sort(
                (a, b) =>
                    Number(b.precio) -
                    Number(a.precio)
            );

            break;


        case 'nombre':

            resultado.sort(
                (a, b) =>
                    String(a.nombre || '')
                        .localeCompare(
                            String(
                                b.nombre || ''
                            ),
                            'es'
                        )
            );

            break;


        default:

            resultado.sort(
                (a, b) =>
                    (
                        Number(a.orden) || 0
                    ) -
                    (
                        Number(b.orden) || 0
                    )
            );
    }


    return resultado;
}


/* ------------------------------------------
   RENDERIZAR PRODUCTOS
------------------------------------------ */

function renderizar() {

    const lista =
        obtenerProductosFiltrados();


    resultadoInfo.textContent =
        lista.length === 1
            ? '1 producto'
            : `${lista.length} productos`;


    if (lista.length === 0) {

        catalogo.innerHTML = `
            <div class="sin-resultados">
                No encontramos productos
                que coincidan con tu búsqueda.
            </div>
        `;

        return;
    }


    catalogo.innerHTML =
        lista
            .map(
                producto =>
                    crearTarjeta
(
                        producto
                    )
            )
            .join('');


    activarGalerias();
    activarTarjetas();
}


/* ------------------------------------------


busqueda.addEventListener(
    'input',
    renderizar
);


categoria.addEventListener(
    'change',

    renderizar
);


disponibilidad.addEventListener(
    'change',
    renderizar
);


ordenamiento.addEventListener(
    'change',
    renderizar
);

/* ------------------------------------------
   INICIO
------------------------------------------ */

configurarIndicadoresBanners(banners);
cargarBanners(banners);
cargar();
