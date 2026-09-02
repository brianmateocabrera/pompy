/* ------------------------------------------
   BLOG.JS
   Lógica del blog — lista de artículos y vista individual
------------------------------------------ */

import {
    escaparHTML,
    formatearPrecio,
    actualizarBadgeCarrito,
    renderizarCarrito,
    activarCarritoBotones,
    enviarCarritoWhatsApp,
    WHATSAPP_NUMERO
} from './index-tarjetas.js';

const API_URL = '/api/crud';
const PATH_BLOG = 'data/blog.json';

/* ---------- CARGAR ARTÍCULOS ---------- */

async function cargarArticulos() {
    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET', path: PATH_BLOG })
        });

        const json = await respuesta.json();

        if (!respuesta.ok || !json.success || !Array.isArray(json.data)) {
            throw new Error(json.error || 'No se pudieron cargar los artículos.');
        }

        return json.data.filter(art => art.activo !== false);
    } catch (error) {
        // Si el archivo no existe todavía, mostrar estado vacío
        console.log('Blog no disponible aún:', error.message);
        return null;
    }
}

/* ---------- FORMATEAR FECHA ---------- */

function formatearFecha(fecha) {
    if (!fecha) return '';
    try {
        return new Date(fecha).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return fecha;
    }
}

/* ---------- RENDERIZAR LISTA ---------- */

function renderizarLista(articulos) {
    const contenido = document.getElementById('contenido');

    if (!articulos || articulos.length === 0) {
        contenido.innerHTML = `
            <section class="blog-vacio">
                <i class="fa-solid fa-pen-nib"></i>
                <h2>Nuestro blog está en preparación</h2>
                <p>Pronto compartiremos guías, tips y novedades sobre lencería y sex-shop.</p>
             
   <a href="/" class="blog-vacio-btn">
                    <i class="fa-solid fa-store"></i> Ver productos
                </a>
            </section>
        `;
        return;
    }

    const tarjetas = articulos
        .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
        .map(art => {
            const titulo = escaparHTML(art.titulo || '');
            const resumen = escaparHTML(art.resumen || art.contenido?.substring(0, 150) || '');
            const imagen = escaparHTML(art.imagen || '/imagenes/no-image.webp');
            const fecha = formatearFecha(art.fecha);
            const autor = escaparHTML(art.autor || 'POMPY');
            const slug = escaparHTML(art.slug || '');

            return `
                <article class="blog-card" data-slug="${slug}">
                    <div class="blog-card-imagen-contenedor">
                        <img src="${imagen}" alt="${titulo}" class="blog-card-imagen" loading="lazy"
                            onerror="this.src='/imagenes/no-image.webp'">
                    </div>
                    <div class="blog-card-body">
                        ${fecha ? `<span class="blog-card-fecha"><i class="fa-regular fa-calendar"></i> ${fecha}</span>` : ''}
                        <h2 class="blog-card-titulo">${titulo}</h2>
                        <p class="blog-card-resumen">${resumen}${(art.contenido?.length || 0) > 150 ? '...' : ''}</p>
                        <span class="blog-card-autor"><i class="fa-regular fa-user"></i> ${autor}</span>
                    </div>
                </article>
            `;
        }).join('');

    contenido.innerHTML = `
        <section class="blog-header">
            <h1>Blog de POMPY</h1>
            <p>Guías, tips y novedades</p>
        </section>
        <div class="blog-grid">${tarjetas}</div>
    `;

    // Activar clicks en tarjetas
    document.querySelectorAll('.blog-card[data-slug]').forEach(card => {
        card.addEventListener('click', () => {
    
        const slug = card.dataset.slug;
            if (slug) {
                window.location.href = `/blog.html?slug=${encodeURIComponent(slug)}`;
            }
        });
    });
}

/* ---------- RENDERIZAR ARTÍCULO INDIVIDUAL ---------- */

function renderizarArticulo(articulo, articulos) {
    const contenido = document.getElementById('contenido');
    const titulo = escaparHTML(articulo.titulo || '');
    const texto = (articulo.contenido || '').split('\n').map(parrafo =>
        parrafo.trim() ? `<p>${escaparHTML(parrafo)}</p>` : ''
    ).join('');
    const imagen = escaparHTML(articulo.imagen || '/imagenes/no-image.webp');
    const fecha = formatearFecha(articulo.fecha);
    const autor = escaparHTML(articulo.autor || 'POMPY');

    // Artículos relacionados (mismos tags o categoría)
    const relacionados = (articulos || [])
        .filter(a => a.slug !== articulo.slug && a.activo !== false)
        .slice(0, 3)
        .map(art => {
            const t = escaparHTML(art.titulo || '');
            const img = escaparHTML(art.imagen || '/imagenes/no-image.webp');
            return `
                <a class="blog-relacionado" href="/blog.html?slug=${encodeURIComponent(art.slug)}">
                    <img src="${img}" alt="${t}" loading="lazy" onerror="this.src='/imagenes/no-image.webp'">
                    <h4>${t}</h4>
                </a>
            `;
        }).join('');

    document.title = `${articulo.titulo || 'Artículo'} — POMPY Blog`;

    contenido.innerHTML = `
        <article class="blog-articulo">
            <a href="/blog.html" class="blog-volver-lista">
                <i class="fa-solid fa-arrow-left"></i> Volver al blog
            </a>
            <div class="blog-articulo-imagen-contenedor">
                <img src="${imagen}" alt="${titulo}" class="blog-articulo-imagen"
                    onerror="this.src='/imagenes/no-image.webp'">
            </div>
            <div class="blog-articulo-body">
                ${fecha ? `<
span class="blog-articulo-fecha"><i class="fa-regular fa-calendar"></i> ${fecha}</span>` : ''}
                <h1>${titulo}</h1>
                <span class="blog-articulo-autor"><i class="fa-regular fa-user"></i> Por ${autor}</span>
                <div class="blog-articulo-contenido">${texto}</div>
            </div>
            ${relacionados ? `
                <section class="blog-relacionados">
                    <h3>Seguir leyendo</h3>
                    <div class="blog-relacionados-grid">${relacionados}</div>
                </section>
            ` : ''}
        </article>
    `;
}

/* ---------- DRAWER CARRITO ---------- */

const overlay = document.getElementById('overlay');

function abrirCarrito() {
    const drawer = document.getElementById('drawer-cart');
    if (drawer) {
        drawer.classList.add('abierto');
        overlay.classList.add('visible');
        renderizarCarrito();
        activarCarritoBotones();
    }
}

function cerrarDrawers() {
    document.querySelectorAll('.drawer.abierto').forEach(d => d.classList.remove('abierto'));
    overlay.classList.remove('visible');
}

document.getElementById('btnCart').addEventListener('click', abrirCarrito);
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', cerrarDrawers);
});
overlay.addEventListener('click', cerrarDrawers);
document.getElementById('btnCheckout').addEventListener('click', enviarCarritoWhatsApp);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cerrarDrawers();
});

const cartDrawer = document.getElementById('drawer-cart');
if (cartDrawer) {
    const observer = new MutationObserver(() => {
        if (cartDrawer.classList.contains('abierto')) {
            renderizarCarrito();
            activarCarritoBotones();
        }
    });
    observer.observe(cartDrawer, { attributes: true, attributeFilter: ['class'] });
}

/* ---------- INICIALIZACIÓN ---------- */

async function iniciar() {
    actualizarBadgeCarrito();

    const slug = new URLSearchParams(window.location.search).get('slug');
    const articulos = await cargarArticulos();

    if (!articulos) {
        // El archivo blog.json no existe todavía
        renderizarLista([]);
        return;
    }

    if (slug) {
        const articulo = articulos.find(a => a.slug === slug);
        if (articulo) {
            renderizarArticulo(articulo, articulos);
        } else {
            renderizarLista(articulos);
        }
    } else {
        renderizarLista(articulos);
    }
}

iniciar();