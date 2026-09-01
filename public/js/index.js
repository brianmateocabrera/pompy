/* ------------------------------------------
   INDEX.JS — Orquestador del catálogo
   Importa de index-tarjetas, index-destacados e index-banners
------------------------------------------ */

import {
    escaparHTML,
    crearTarjeta,
    activarTarjetas,
    activarGalerias,
    actualizarBadgeCarrito,
    actualizarBadgeFavoritos,
    renderizarCarrito,
    activarCarritoBotones,
    enviarCarritoWhatsApp
} from './index-tarjetas.js';
import { renderizarDestacados } from './index-destacados.js';
import { cargarBanners, configurarIndicadoresBanners } from './index-banners.js';

const API_URL = '/api/crud';
const PATH_PRODUCTOS = 'data/productos.json';

let productos = [];

const catalogo = document.getElementById('catalogo');
const resultadoInfo = document.getElementById('resultadoInfo');
const banners = document.getElementById('banners');
const destacados = document.getElementById('destacados');
const overlay = document.getElementById('overlay');
const searchOverlay = document.getElementById('searchOverlay');

// Elementos de búsqueda (desktop = busqueda, móvil = busquedaMobile)
const busqueda = document.getElementById('busqueda');
const busquedaMobile = document.getElementById('busquedaMobile');

// Elementos de filtros (mobile = drawer selects, desktop = inline selects)
const categoria = document.getElementById('categoria');
const disponibilidad = document.getElementById('disponibilidad');
const categoriaDesktop = document.getElementById('categoriaDesktop');
const disponibilidadDesktop = document.getElementById('disponibilidadDesktop');
const ordenamientoDesktop = document.getElementById('ordenamientoDesktop');

/* ---------- DRAWERS ---------- */

function abrirDrawer(id) {
    const drawer = document.getElementById(id);
    if (drawer) {
        drawer.classList.add('abierto');
        overlay.classList.add('visible');
    }
}

function cerrarDrawers() {
    document.querySelectorAll('.drawer.abierto').forEach(d => d.classList.remove('abierto'));
    overlay.classList.remove('visible');
}

function toggleSearch() {
    const abierto = searchOverlay.classList.contains('visible');
    if (abierto) {
        searchOverlay.classList.remove('visible');
    } else {
        searchOverlay.classList.add('visible');
        if (busquedaMobile) busquedaMobile.focus();
    }
}

function cerrarSearch() {
    searchOverlay.classList.remove('visible');
}

/* ---------- SINCRONIZAR FILTROS ---------- */

// Sincronizar búsqueda desktop <-> móvil
function getBusquedaValue() {
    return (busqueda && busqueda.value) || (busquedaMobile && busquedaMobile.value) || '';
}

function setBusquedaValue(val) {
    if (busqueda) busqueda.value = val;
    if (busquedaMobile) busquedaMobile.value = val;
}

// Sincronizar categoría
function getCategoriaValue() {
    return (categoria && categoria.value) || (categoriaDesktop && categoriaDesktop.value) || '';
}

function setCategoriaValue(val) {
    if (categoria) categoria.value = val;
    if (categoriaDesktop) categoriaDesktop.value = val;
}

// Sincronizar disponibilidad
function getDisponibilidadValue() {
    return (disponibilidad && disponibilidad.value) || (disponibilidadDesktop && disponibilidadDesktop.value) || '';
}

function setDisponibilidadValue(val) {
    if (disponibilidad) disponibilidad.value = val;
    if (disponibilidadDesktop) disponibilidadDesktop.value = val;
}

// Sincronizar orden (radio mobile + select desktop)
function getOrdenValue() {
    if (ordenamientoDesktop && ordenamientoDesktop.offsetParent !== null) {
        return ordenamientoDesktop.value;
    }
    const radio = document.querySelector('input[name="orden"]:checked');
    return radio ? radio.value : 'orden';
}

function setOrdenValue(val) {
    if (ordenamientoDesktop) ordenamientoDesktop.value = val;
    const radio = document.querySelector(`input[name="orden"][value="${val}"]`);
    if (radio) radio.checked = true;
}

/* ---------- CARGAR CATÁLOGO ---------- */

async function cargar() {
    // Mostrar skeleton mientras carga
    catalogo.innerHTML = Array(8).fill('<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>').join('');

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET', path: PATH_PRODUCTOS })
        });

        const json = await respuesta.json();

        if (!respuesta.ok || !json.success || !Array.isArray(json.data)) {
            throw new Error(json.error || 'No se pudo cargar el catálogo.');
        }

        productos = json.data.filter(producto => producto.activo !== false);

        cargarCategorias();
        renderizar();
        renderizarDestacados(productos, destacados);
    } catch (error) {
        console.error('Error cargando catálogo:', error);
        resultadoInfo.textContent = '';
        catalogo.innerHTML = '<div class="error">Error al cargar el catálogo.</div>';
    }
}

/* ---------- CATEGORÍAS ---------- */

function cargarCategorias() {
    const categorias = new Set();

    productos.forEach(producto => {
        if (!Array.isArray(producto.categoria)) return;
        producto.categoria.forEach(nombre => {
            if (nombre) categorias.add(nombre);
        });
    });

    const lista = [...categorias].sort((a, b) => a.localeCompare(b, 'es'));

    const opciones = '<option value="">Todas las categorías</option>' +
        lista.map(nombre =>
            `<option value="${escaparHTML(nombre)}">${escaparHTML(nombre)}</option>`
        ).join('');

    if (categoria) categoria.innerHTML = opciones;
    if (categoriaDesktop) categoriaDesktop.innerHTML = opciones;

    const menuCategorias = document.getElementById('menuCategoriasLista');
    if (menuCategorias) {
        menuCategorias.innerHTML = lista.map(nombre =>
            `<a href="#" class="menu-categoria-link" data-categoria="${escaparHTML(nombre)}">${escaparHTML(nombre)}</a>`
        ).join('');

        menuCategorias.querySelectorAll('.menu-categoria-link').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                setCategoriaValue(link.dataset.categoria);
                cerrarDrawers();
                renderizar();
            });
        });
    }
}

/* ---------- FILTROS Y ORDEN ---------- */

function obtenerProductosFiltrados() {
    const texto = getBusquedaValue().trim().toLowerCase();
    const categoriaSeleccionada = getCategoriaValue();
    const disponibilidadSeleccionada = getDisponibilidadValue();

    let resultado = productos.filter(producto => {
        const textoProducto = [
            producto.nombre,
            producto.descripcion,
            ...(producto.tags || []),
            ...(producto.categoria || [])
        ].join(' ').toLowerCase();

        if (texto && !textoProducto.includes(texto)) return false;

        if (categoriaSeleccionada &&
            !(Array.isArray(producto.categoria) && producto.categoria.includes(categoriaSeleccionada))) {
            return false;
        }

        const stock = Number(producto.stock) || 0;

        if (disponibilidadSeleccionada === 'disponible' && stock <= 0) return false;
        if (disponibilidadSeleccionada === 'agotado' && stock > 0) return false;

        return true;
    });

    const orden = getOrdenValue();

    switch (orden) {
        case 'precio-menor':
            resultado.sort((a, b) => Number(a.precio) - Number(b.precio));
            break;
        case 'precio-mayor':
            resultado.sort((a, b) => Number(b.precio) - Number(a.precio));
            break;
        case 'nombre':
            resultado.sort((a, b) =>
                String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
            break;
        default:
            resultado.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
    }

    return resultado;
}

/* ---------- RENDERIZAR ---------- */

function renderizar() {
    const lista = obtenerProductosFiltrados();

    resultadoInfo.textContent = lista.length === 1
        ? '1 producto'
        : `${lista.length} productos`;

    if (lista.length === 0) {
        catalogo.innerHTML = '<div class="sin-resultados">No encontramos productos que coincidan con tu búsqueda.</div>';
        return;
    }

    catalogo.innerHTML = lista.map(producto => crearTarjeta(producto)).join('');
    activarGalerias();
    activarTarjetas();
}

/* ---------- RENDERIZAR FAVORITOS ---------- */

function renderizarFavoritos() {
    let favs = [];
    try {
        favs = JSON.parse(localStorage.getItem('pompy-favoritos') || '[]');
    } catch {
        favs = [];
    }

    if (favs.length === 0) {
        catalogo.innerHTML = '<div class="favoritos-vacio"><i class="fa-regular fa-heart" style="font-size:48px;color:#ddd"></i><h3>Tus favoritos aparecerán aquí</h3><p>Toca el corazón en cualquier producto para guardarlo.</p></div>';
        resultadoInfo.textContent = '';
        return;
    }

    setBusquedaValue('');
    setCategoriaValue('');
    setDisponibilidadValue('');

    const listaFavs = productos.filter(p => favs.includes(p.slug));
    resultadoInfo.textContent = listaFavs.length === 1 ? '1 favorito' : `${listaFavs.length} favoritos`;

    if (listaFavs.length === 0) {
        catalogo.innerHTML = '<div class="sin-resultados">No tienes productos favoritos guardados.</div>';
    } else {
        catalogo.innerHTML = listaFavs.map(p => crearTarjeta(p)).join('');
        activarGalerias();
        activarTarjetas();
    }
    document.querySelector('.catalogo-sticky').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- EVENTOS ---------- */

// Búsqueda
if (busqueda) busqueda.addEventListener('input', renderizar);
if (busquedaMobile) busquedaMobile.addEventListener('input', () => {
    if (busqueda) busqueda.value = busquedaMobile.value;
    renderizar();
});

// Filtros móvil (drawers)
if (categoria) categoria.addEventListener('change', () => {
    if (categoriaDesktop) categoriaDesktop.value = categoria.value;
    renderizar();
});
if (disponibilidad) disponibilidad.addEventListener('change', () => {
    if (disponibilidadDesktop) disponibilidadDesktop.value = disponibilidad.value;
    renderizar();
});

// Filtros desktop (inline)
if (categoriaDesktop) categoriaDesktop.addEventListener('change', () => {
    if (categoria) categoria.value = categoriaDesktop.value;
    renderizar();
});
if (disponibilidadDesktop) disponibilidadDesktop.addEventListener('change', () => {
    if (disponibilidad) disponibilidad.value = disponibilidadDesktop.value;
    renderizar();
});
if (ordenamientoDesktop) ordenamientoDesktop.addEventListener('change', renderizar);

// Radio buttons de orden (móvil)
document.querySelectorAll('input[name="orden"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (ordenamientoDesktop) ordenamientoDesktop.value = radio.value;
        renderizar();
    });
});

// Botones del header
document.getElementById('btnMenu').addEventListener('click', () => abrirDrawer('drawer-menu'));
document.getElementById('btnSearch').addEventListener('click', toggleSearch);
document.getElementById('btnCart').addEventListener('click', () => abrirDrawer('drawer-cart'));
document.getElementById('btnCerrarSearch').addEventListener('click', cerrarSearch);

// Botones de la toolbar (móvil)
document.getElementById('btnFiltrar').addEventListener('click', () => abrirDrawer('drawer-filtros'));
document.getElementById('btnOrdenar').addEventListener('click', () => abrirDrawer('drawer-orden'));

// Botones de la barra inferior
document.getElementById('navCatalogo').addEventListener('click', () => {
    abrirDrawer('drawer-filtros');
});
document.getElementById('navCart').addEventListener('click', () => abrirDrawer('drawer-cart'));
document.getElementById('navFavoritos').addEventListener('click', (e) => { e.preventDefault(); window.location.href = '/favoritos.html'; });

// Menú favoritos
const menuFav = document.getElementById('menuFavoritos');
if (menuFav) menuFav.addEventListener('click', (event) => {
    event.preventDefault();
    cerrarDrawers();
    window.location.href = '/favoritos.html';
});

// Cerrar drawers
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', cerrarDrawers);
});

overlay.addEventListener('click', cerrarDrawers);

// Limpiar filtros
document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
    setCategoriaValue('');
    setDisponibilidadValue('');
    renderizar();
    cerrarDrawers();
});

// Checkout (enviar por WhatsApp)
document.getElementById('btnCheckout').addEventListener('click', enviarCarritoWhatsApp);

// Re-renderizar carrito al abrir el drawer del carrito
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

// Cerrar con Escape
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        cerrarDrawers();
        cerrarSearch();
    }
});

// Sincronizar badge de carrito en la barra inferior
function sincronizarBadges() {
    const badge1 = document.getElementById('cartBadge');
    const badge2 = document.getElementById('cartBadge2');
    if (badge1 && badge2) {
        badge2.textContent = badge1.textContent;
        badge2.style.display = badge1.style.display;
    }
}

const badge1 = document.getElementById('cartBadge');
if (badge1) {
    const badgeObserver = new MutationObserver(sincronizarBadges);
    badgeObserver.observe(badge1, { attributes: true, childList: true, characterData: true, subtree: true });
}

/* ---------- INICIALIZACIÓN ---------- */

configurarIndicadoresBanners(banners);
cargarBanners(banners);
actualizarBadgeCarrito();
actualizarBadgeFavoritos();
cargar();

// Botón volver arriba
const btnTop = document.getElementById('btnTop');
if (btnTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btnTop.classList.add('visible');
        } else {
            btnTop.classList.remove('visible');
        }
    });
    btnTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}


// Autocompletado de búsqueda
function activarAutocompletado() {
    const inputs = [
        document.getElementById('busqueda'),
        document.getElementById('busquedaMobile')
    ].filter(Boolean);
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            const cont = document.getElementById('searchSugerencias');
            if (!cont) return;
            if (query.length < 2) {
                cont.innerHTML = '';
                return;
            }
            const sugerencias = productos
                .filter(p => p.nombre && p.nombre.toLowerCase().includes(query))
                .slice(0, 5);
            if (sugerencias.length === 0) {
                cont.innerHTML = '<div class="search-sugerencia-empty">Sin resultados para "' + escaparHTML(query) + '"</div>';
                return;
            }
            cont.innerHTML = sugerencias.map(p => {
                const img = (p.imagenes && p.imagenes[0]) || p.imagen || '';
                const precio = p.precio ? formatearPrecio(p.precio) : '';
                return '<a href="/producto.html?slug=' + encodeURIComponent(p.slug) + '" class="search-sugerencia">' +
                    (img ? '<img src="' + escaparHTML(img) + '" alt="" loading="lazy">' : '<div class="sug-img-placeholder"><i class="fa-solid fa-image"></i></div>') +
                    '<div><div class="sug-nombre">' + escaparHTML(p.nombre) + '</div>' +
                    (precio ? '<div class="sug-precio">' + precio + '</div>' : '') + '</div></a>';
            }).join('');
        });
    });
    const btnCerrar = document.getElementById('btnCerrarSearch');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
            const cont = document.getElementById('searchSugerencias');
            if (cont) cont.innerHTML = '';
        });
    }
}

const _cargarOriginal = cargar;
cargar = async function() {
    await _cargarOriginal();
    activarAutocompletado();
};
