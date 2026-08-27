const API_URL = '/api/crud';
const PATH_PRODUCTOS = 'data/productos.json';
const PATH_BANNERS = 'data/banners.json';
const WHATSAPP_NUMERO = '5493518189444';

const MENSAJE_WHATSAPP =
    'Hola, quisiera consultar por este producto:';

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


/* ------------------------------------------
   UTILIDADES
------------------------------------------ */

function escaparHTML(texto) {

    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


function formatearPrecio(valor) {

    return new Intl.NumberFormat(
        'es-AR',
        {
            style: 'currency',
            currency: 'ARS'
        }
    ).format(
        Number(valor) || 0
    );
}


function obtenerImagenPrincipal(producto) {

    return producto.imagenPrincipal ||
        producto.imagenes?.[0]?.url ||
        producto.imagen ||
        '/imagenes/no-image.webp';
}


/* ------------------------------------------
   CARGAR PRODUCTOS
------------------------------------------ */

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
                        JSON.stringify({
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

renderizarDestacados();


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
                    crearTarjeta(
                        producto
                    )
            )
            .join('');


    activarGalerias();
    activarTarjetas();
}


/* ------------------------------------------
   TARJETA
------------------------------------------ */

function crearTarjeta(producto) {

    const nombre =
        escaparHTML(
            producto.nombre
        );


    const imagenPrincipal =
        escaparHTML(
            obtenerImagenPrincipal(
                producto
            )
        );


    const precio =
        formatearPrecio(
            producto.precio
        );


    const tienePrecioAnterior =
        producto.precioAnterior !== null &&
        producto.precioAnterior !== undefined &&
        producto.precioAnterior !== '' &&
        Number(producto.precioAnterior) >
            Number(producto.precio);


    const precioAnterior =
        tienePrecioAnterior
            ? `
                <span class="precio-anterior">
                    ${formatearPrecio(
                        producto.precioAnterior
                    )}
                </span>
            `
            : '';


    const stock =
        Number(producto.stock) || 0;


    const badges =
        Array.isArray(producto.badges)
            ? producto.badges
                .filter(Boolean)
                .map(
                    badge => `
                        <span class="badge">
                            ${escaparHTML(badge)}
                        </span>
                    `
                )
                .join('')
            : '';


    const sinStock =
        stock <= 0
            ? `
                <span class="badge badge-sin-stock">
                    Sin stock
                </span>
            `
            : '';


    const mensajeWhatsApp =
        encodeURIComponent(
            `Hola, quisiera consultar por este producto: ${producto.nombre}`
        );


    return `
        <article
            class="card"
            data-slug="${escaparHTML(producto.slug || '')}"
            role="link"
            tabindex="0"
        >

            <div class="imagen-contenedor">

                <img
                    src="${imagenPrincipal}"
                    class="card-img"
                    alt="${nombre}"
                    loading="lazy"
                    onerror="
                        this.src='/imagenes/no-image.webp'
                    "
                >

                <div class="badge-contenedor">
                    ${badges}
                    ${sinStock}
                </div>

            </div>


            <div class="card-info">

                <h2 class="card-title">
                    ${nombre}
                </h2>


                <p class="card-price">

                    <span class="precio-actual">
                        ${precio}
                    </span>

                    ${precioAnterior}

                </p>


                <a
                    class="boton-whatsapp"
                    href="https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWhatsApp}"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Consultar ${nombre} por WhatsApp"
                >
                    <i class="fa-brands fa-whatsapp"></i>
                    Consultar por WhatsApp
                </a>

            </div>

        </article>
    `;
}

/* ------------------------------------------
   TARJETAS
------------------------------------------ */

function activarTarjetas() {

    document
        .querySelectorAll('.card[data-slug]')
        .forEach(
            card => {

                const abrir =
                    () => {

                        const slug =
                            card.dataset.slug;


                        if (!slug) {
                            return;
                        }


                        window.location.href =
                            `/producto.html?slug=${encodeURIComponent(slug)}`;
                    };


                card.addEventListener(
                    'click',
                    event => {

                        if (
                            event.target.closest(
                                '.boton-whatsapp'
                            )
                        ) {
                            return;
                        }


                        abrir();
                    }
                );


                card.addEventListener(
                    'keydown',
                    event => {

                        if (
                            event.key === 'Enter' ||
                            event.key === ' '
                        ) {

                            event.preventDefault();

                            abrir();
                        }
                    }
                );
            }
        );
}

/* ------------------------------------------
   GALERÍA
------------------------------------------ */

function activarGalerias() {

    document
        .querySelectorAll(
            '.galeria-mini img'
        )
        .forEach(
            miniatura => {

                miniatura.addEventListener(
                    'click',
                    () => {

                        const contenedor =
                            miniatura.closest(
                                '.card'
                            );


                        const imagenPrincipal =
                            contenedor.querySelector(
                                '.card-img'
                            );


                        imagenPrincipal.src =
                            miniatura.dataset.imagen;
                    }
                );
            }
        );
}


/* ------------------------------------------
   EVENTOS
------------------------------------------ */

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

/* ==========================================
   PRODUCTOS DESTACADOS
========================================== */

/* ------------------------------------------
   RENDERIZAR DESTACADOS
------------------------------------------ */

function renderizarDestacados() {

    if (!destacados) {
        return;
    }


    const lista =
        productos.filter(
            producto =>
                producto.destacado === true
        );


    if (!lista.length) {

        destacados.innerHTML = '';

        return;
    }


    const tarjetas =
        lista
            .map(
                producto =>
                    crearTarjeta(producto)
            )
            .join('');


    destacados.innerHTML = `

        <div class="destacados-header">

            <h2 class="destacados-titulo">
                Destacados
            </h2>

        </div>

        <div
            class="destacados-track"
            tabindex="0"
        >
            ${tarjetas}
        </div>
    `;


    activarGaleriasDestacados();
    activarTarjetasDestacados();
    activarArrastreDestacados();
}


/* ------------------------------------------
   GALERÍAS DE DESTACADOS
------------------------------------------ */

function activarGaleriasDestacados() {

    destacados
        .querySelectorAll(
            '.galeria-mini img'
        )
        .forEach(
            miniatura => {

                miniatura.addEventListener(
                    'click',
                    event => {

                        event.stopPropagation();


                        const contenedor =
                            miniatura.closest(
                                '.card'
                            );


                        const imagenPrincipal =
                            contenedor.querySelector(
                                '.card-img'
                            );


                        imagenPrincipal.src =
                            miniatura.dataset.imagen;
                    }
                );
            }
        );
}


/* ------------------------------------------
   TARJETAS DE DESTACADOS
------------------------------------------ */

function activarTarjetasDestacados() {

    destacados
        .querySelectorAll(
            '.card[data-slug]'
        )
        .forEach(
            card => {

                const abrir =
                    () => {

                        const slug =
                            card.dataset.slug;


                        if (!slug) {
                            return;
                        }


                        window.location.href =
                            `/producto.html?slug=${encodeURIComponent(slug)}`;
                    };


                card.addEventListener(
                    'click',
                    event => {

                        if (
                            event.target.closest(
                                '.boton-whatsapp'
                            )
                        ) {
                            return;
                        }


                        if (
                            card.dataset.arrastrado ===
                            'true'
                        ) {

                            card.dataset.arrastrado =
                                'false';

                            return;
                        }


                        abrir();
                    }
                );


                card.addEventListener(
                    'keydown',
                    event => {

                        if (
                            event.key === 'Enter' ||
                            event.key === ' '
                        ) {

                            event.preventDefault();

                            abrir();
                        }
                    }
                );
            }
        );
}

/* ------------------------------------------
   ARRASTRE HORIZONTAL
------------------------------------------ */

function activarArrastreDestacados() {

    const track =
        destacados.querySelector(
            '.destacados-track'
        );


    if (!track) {
        return;
    }


    let arrastrando = false;
    let inicioX = 0;
    let scrollInicial = 0;
    let movimiento = false;


    track.addEventListener(
        'pointerdown',
        event => {

            if (
                event.pointerType === 'mouse' &&
                event.button !== 0
            ) {
                return;
            }


            arrastrando = true;
            movimiento = false;

            inicioX =
                event.clientX;

            scrollInicial =
                track.scrollLeft;


            track.classList.add(
                'arrastrando'
            );


            track.setPointerCapture(
                event.pointerId
            );
        }
    );


    track.addEventListener(
        'pointermove',
        event => {

            if (!arrastrando) {
                return;
            }


            const desplazamiento =
                event.clientX -
                inicioX;


            if (
                Math.abs(
                    desplazamiento
                ) > 5
            ) {

                movimiento = true;
            }


            track.scrollLeft =
                scrollInicial -
                desplazamiento;


            if (movimiento) {

                track
                    .querySelectorAll('.card')
                    .forEach(
                        card => {

                            card.dataset.arrastrado =
                                'true';
                        }
                    );
            }
        }
    );


    const finalizarArrastre =
        event => {

            if (!arrastrando) {
                return;
            }


            arrastrando = false;

            track.classList.remove(
                'arrastrando'
            );


            if (
                track.hasPointerCapture(
                    event.pointerId
                )
            ) {

                track.releasePointerCapture(
                    event.pointerId
                );
            }


            if (movimiento) {

                setTimeout(
                    () => {

                        track
                            .querySelectorAll(
                                '.card'
                            )
                            .forEach(
                                card => {

                                    card.dataset.arrastrado =
                                        'false';
                                }
                            );

                    },
                    0
                );
            }
        };


    track.addEventListener(
        'pointerup',
        finalizarArrastre
    );


    track.addEventListener(
        'pointercancel',
        finalizarArrastre
    );
}

/* ==========================================
   BANNERS
========================================== */

let intervaloCarrusel = null;
let indiceBanner = 0;


/* ------------------------------------------
   CARGAR BANNERS
------------------------------------------ */

async function cargarBanners() {

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
                        JSON.stringify({
                            action: 'GET',
                            path: PATH_BANNERS
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
                'No se pudieron cargar los banners.'
            );
        }


        const activos =
            json.data
                .filter(
                    banner =>
                        banner &&
                        banner.activo !== false &&
                        banner.imagen
                )
                .sort(
                    (a, b) =>
                        (Number(a.orden) || 0) -
                        (Number(b.orden) || 0)
                );


        renderizarBanners(
            activos
        );


    } catch (error) {

        console.error(
            'Error cargando banners:',
            error
        );


        banners.innerHTML = '';
    }
}


/* ------------------------------------------
   RENDERIZAR BANNERS
------------------------------------------ */

function renderizarBanners(lista) {

    if (!lista.length) {

        banners.innerHTML = '';

        return;
    }


    const slides =
        lista
            .map(
                (banner, index) => {

                    const imagen =
                        escaparHTML(
                            banner.imagen
                        );


                    const titulo =
                        escaparHTML(
                            banner.titulo
                        );


                    const enlace =
                        String(
                            banner.enlace || ''
                        ).trim();


                    const contenido = `

                        <img
                            src="${imagen}"
                            alt="${titulo}"
                            loading="${
                                index === 0
                                    ? 'eager'
                                    : 'lazy'
                            }"
                            onerror="
                                this.closest('.banner').remove()
                            "
                        >

                        ${
                            titulo
                                ? `
                                    <div class="banner-info">
                                        <h2>
                                            ${titulo}
                                        </h2>
                                    </div>
                                `
                                : ''
                        }

                    `;


                    if (enlace) {

                        return `
                            <a
                                class="banner"
                                href="${escaparHTML(enlace)}"
                            >
                                ${contenido}
                            </a>
                        `;
                    }


                    return `
                        <div class="banner">
                            ${contenido}
                        </div>
                    `;
                }
            )
            .join('');


    const indicadores =
        lista.length > 1
            ? `
                <div class="banner-indicadores">

                    ${lista
                        .map(
                            (_, index) => `
                                <button
                                    type="button"
                                    class="banner-indicador ${
                                        index === 0
                                            ? 'activo'
                                            : ''
                                    }"
                                    data-banner-index="${index}"
                                    aria-label="Ir al banner ${index + 1}"
                                ></button>
                            `
                        )
                        .join('')}

                </div>
            `
            : '';


    banners.innerHTML = `

        <div class="banners-track">
            ${slides}
        </div>

        ${indicadores}

    `;


    iniciarCarrusel(
        lista.length
    );
}


/* ------------------------------------------
   MOSTRAR BANNER
------------------------------------------ */

function mostrarBanner(indice) {

    const track =
        banners.querySelector(
            '.banners-track'
        );


    const indicadores =
        banners.querySelectorAll(
            '.banner-indicador'
        );


    if (!track) {
        return;
    }


    indiceBanner =
        indice;


    track.style.transform =
        `translateX(-${indice * 100}%)`;


    indicadores.forEach(
        (indicador, index) => {

            indicador.classList.toggle(
                'activo',
                index === indice
            );
        }
    );
}


/* ------------------------------------------
   INICIAR CARRUSEL
------------------------------------------ */

function iniciarCarrusel(cantidad) {

    if (intervaloCarrusel) {

        clearInterval(
            intervaloCarrusel
        );

        intervaloCarrusel = null;
    }


    indiceBanner = 0;

    mostrarBanner(0);


    if (cantidad <= 1) {
        return;
    }


    intervaloCarrusel =
        setInterval(
            () => {

                const siguiente =
                    (
                        indiceBanner + 1
                    ) % cantidad;


                mostrarBanner(
                    siguiente
                );

            },
            5000
        );
}


/* ------------------------------------------
   REINICIAR CARRUSEL
------------------------------------------ */

function reiniciarCarrusel(cantidad) {

    if (intervaloCarrusel) {

        clearInterval(
            intervaloCarrusel
        );

        intervaloCarrusel = null;
    }


    if (cantidad <= 1) {
        return;
    }


    intervaloCarrusel =
        setInterval(
            () => {

                const siguiente =
                    (
                        indiceBanner + 1
                    ) % cantidad;


                mostrarBanner(
                    siguiente
                );

            },
            5000
        );
}


/* ------------------------------------------
   INDICADORES
------------------------------------------ */

banners.addEventListener(
    'click',
    event => {

        const indicador =
            event.target.closest(
                '.banner-indicador'
            );


        if (!indicador) {
            return;
        }


        const indice =
            Number(
                indicador.dataset.bannerIndex
            );


        if (
            Number.isNaN(indice)
        ) {
            return;
        }


        mostrarBanner(
            indice
        );


        const cantidad =
            banners.querySelectorAll(
                '.banner'
            ).length;


        reiniciarCarrusel(
            cantidad
        );
    }
);


/* ------------------------------------------
   INICIO
------------------------------------------ */

cargarBanners();
cargar();