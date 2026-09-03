/* ------------------------------------------
   BLOG.JS
   Lógica del blog — lista de artículos y vista individual
------------------------------------------ */

import {
    escaparHTML,
    actualizarBadgeCarrito,
    renderizarCarrito,
    activarCarritoBotones,
    enviarCarritoWhatsApp
} from './index-tarjetas.js';

const API_URL = '/api/crud';
const PATH_BLOG = 'data/blog.json';

/* ---------- CARGAR ARTÍCULOS ---------- */

async function cargarArticulos() {
    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'GET',
                path: PATH_BLOG
            })
        });

        const json = await respuesta.json();

        if (!respuesta.ok || !json.success || !Array.isArray(json.data)) {
            throw new Error(
                json.error || 'No se pudieron cargar los artículos.'
            );
        }

        return json.data.filter(art => art.activo !== false);
    } catch (error) {
        console.error('Error al cargar el blog:', error);
        return null;
    }
}

/* ---------- FORMATEAR FECHA ---------- */

function formatearFecha(fecha) {
    if (!fecha) return '';

    const fechaObj = new Date(fecha);

    if (Number.isNaN(fechaObj.getTime())) {
        return '';
    }

    return fechaObj.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/* ---------- RENDERIZAR LISTA ---------- */

function renderizarLista(articulos) {
    const contenido = document.getElementById('contenido');

    if (!contenido) return;

    if (!articulos || articulos.length === 0) {
        contenido.innerHTML = `
            <section class="blog-vacio">
                <i class="fa-solid fa-pen-nib"></i>

                <h2>Nuestro blog está en preparación</h2>

                <p>
                    Pronto compartiremos guías, tips y novedades
                    sobre lencería y sex-shop.
                </p>

                <a href="/" class="blog-vacio-btn">
                    <i class="fa-solid fa-store"></i>
                    Ver productos
                </a>
            </section>
        `;

        return;
    }

    const articulosOrdenados = [...articulos].sort(
        (a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)
    );

    const tarjetas = articulosOrdenados
        .map(art => {
            const titulo = escaparHTML(art.titulo || '');
            const resumen = escaparHTML(
                art.resumen ||
                art.contenido?.substring(0, 150) ||
                ''
            );
            const imagen = escaparHTML(
                art.imagen || '/imagenes/no-image.webp'
            );
            const fecha = formatearFecha(art.fecha);
            const autor = escaparHTML(art.autor || 'POMPY');
            const slug = escaparHTML(art.slug || '');

            return `
                <article
                    class="blog-card"
                    data-slug="${slug}"
                    tabindex="0"
                    role="link"
                    aria-label="Leer ${titulo}"
                >
                    <div class="blog-card-imagen-contenedor">
                        <img
                            src="${imagen}"
                            alt="${titulo}"
                            class="blog-card-imagen"
                            loading="lazy"
                            onerror="this.src='/imagenes/no-image.webp'"
                        >
                    </div>

                    <div class="blog-card-body">
                        ${
                            fecha
                                ? `
                                    <span class="blog-card-fecha">
                                        <i class="fa-regular fa-calendar"></i>
                                        ${fecha}
                                    </span>
                                `
                                : ''
                        }

                        <h2 class="blog-card-titulo">
                            ${titulo}
                        </h2>

                        <p class="blog-card-resumen">
                            ${resumen}
                            ${
                                (art.contenido?.length || 0) > 150
                                    ? '...'
                                    : ''
                            }
                        </p>

                        <span class="blog-card-autor">
                            <i class="fa-regular fa-user"></i>
                            ${autor}
                        </span>
                    </div>
                </article>
            `;
        })
        .join('');

    contenido.innerHTML = `
        <section class="blog-header">
            <h1>Blog de POMPY</h1>
            <p>Guías, tips y novedades</p>
        </section>

        <div class="blog-grid">
            ${tarjetas}
        </div>
    `;

    /* ---------- ACTIVAR TARJETAS ---------- */

    document
        .querySelectorAll('.blog-card[data-slug]')
        .forEach(card => {
            const abrirArticulo = () => {
                const slug = card.dataset.slug;

                if (!slug) return;

                window.location.href =
                    `/blog.html?slug=${encodeURIComponent(slug)}`;
            };

            card.addEventListener('click', abrirArticulo);

            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    abrirArticulo();
                }
            });
        });
}

/* ---------- RENDERIZAR ARTÍCULO INDIVIDUAL ---------- */

function renderizarArticulo(articulo, articulos) {
    const contenido = document.getElementById('contenido');

    if (!contenido || !articulo) return;

    const titulo = escaparHTML(articulo.titulo || '');

    const texto = (articulo.contenido || '')
        .split('\n')
        .map(parrafo => {
            const textoParrafo = parrafo.trim();

            if (!textoParrafo) return '';

            return `<p>${escaparHTML(textoParrafo)}</p>`;
        })
        .join('');

    const imagen = escaparHTML(
        articulo.imagen || '/imagenes/no-image.webp'
    );

    const fecha = formatearFecha(articulo.fecha);
    const autor = escaparHTML(articulo.autor || 'POMPY');

    /* ---------- ARTÍCULOS RELACIONADOS ---------- */

    const relacionados = (articulos || [])
        .filter(
            art =>
                art.slug !== articulo.slug &&
                art.activo !== false
        )
        .slice(0, 3)
        .map(art => {
            const t = escaparHTML(art.titulo || '');
            const img = escaparHTML(
                art.imagen || '/imagenes/no-image.webp'
            );
            const slug = art.slug || '';

            return `
                <a
                    class="blog-relacionado"
                    href="/blog.html?slug=${encodeURIComponent(slug)}"
                >
                    <img
                        src="${img}"
                        alt="${t}"
                        loading="lazy"
                        onerror="this.src='/imagenes/no-image.webp'"
                    >

                    <h4>${t}</h4>
                </a>
            `;
        })
        .join('');

    document.title =
        `${articulo.titulo || 'Artículo'} — POMPY Blog`;

    contenido.innerHTML = `
        <article class="blog-articulo">

            <a href="/blog.html" class="blog-volver-lista">
                <i class="fa-solid fa-arrow-left"></i>
                Volver al blog
            </a>

            <div class="blog-articulo-imagen-contenedor">
                <img
                    src="${imagen}"
                    alt="${titulo}"
                    class="blog-articulo-imagen"
                    onerror="this.src='/imagenes/no-image.webp'"
                >
            </div>

            <div class="blog-articulo-body">

                ${
                    fecha
                        ? `
                            <span class="blog-articulo-fecha">
                                <i class="fa-regular fa-calendar"></i>
                                ${fecha}
                            </span>
                        `
                        : ''
                }

                <h1>${titulo}</h1>

                <span class="blog-articulo-autor">
                    <i class="fa-regular fa-user"></i>
                    Por ${autor}
                </span>

                <div class="blog-articulo-contenido">
                    ${texto}
                </div>

            </div>

            ${
                relacionados
                    ? `
                        <section class="blog-relacionados">
                            <h3>Seguir leyendo</h3>

                            <div class="blog-relacionados-grid">
                                ${relacionados}
                            </div>
                        </section>
                    `
                    : ''
            }

        </article>
    `;
}

/* ---------- DRAWER CARRITO ---------- */

const overlay = document.getElementById('overlay');
const btnCart = document.getElementById('btnCart');
const btnCheckout = document.getElementById('btnCheckout');
const drawerCart = document.getElementById('drawer-cart');

function abrirCarrito() {
    if (!drawerCart || !overlay) return;

    drawerCart.classList.add('abierto');
    overlay.classList.add('visible');

    renderizarCarrito();
    activarCarritoBotones();
}

function cerrarDrawers() {
    if (drawerCart) {
        drawerCart.classList.remove('abierto');
    }

    if (overlay) {
        overlay.classList.remove('visible');
    }
}

/* ---------- EVENTOS DEL CARRITO ---------- */

if (btnCart) {
    btnCart.addEventListener('click', abrirCarrito);
}

document
    .querySelectorAll('[data-close]')
    .forEach(btn => {
        btn.addEventListener('click', cerrarDrawers);
    });

if (overlay) {
    overlay.addEventListener('click', cerrarDrawers);
}

if (btnCheckout) {
    btnCheckout.addEventListener(
        'click',
        enviarCarritoWhatsApp
    );
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        cerrarDrawers();
    }
});

/* ---------- INICIALIZACIÓN ---------- */

async function iniciar() {
    actualizarBadgeCarrito();

    const slug = new URLSearchParams(
        window.location.search
    ).get('slug');

    const articulos = await cargarArticulos();

    if (!articulos) {
        renderizarLista([]);
        return;
    }

    if (slug) {
        const articulo = articulos.find(
            art => art.slug === slug
        );

        if (articulo) {
            renderizarArticulo(articulo, articulos);
        } else {
            renderizarLista(articulos);
        }

        return;
    }

    renderizarLista(articulos);
}

iniciar();