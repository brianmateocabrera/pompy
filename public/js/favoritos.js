import {
    escaparHTML,
    formatearPrecio,
    WHATSAPP_NUMERO,
    crearTarjeta,
    activarTarjetas,
    activarGalerias,
    actualizarBadgeCarrito,
    actualizarBadgeFavoritos,
    renderizarCarrito,
    activarCarritoBotones,
    enviarCarritoWhatsApp,
    obtenerCarrito,
    obtenerFavoritos
} from './index-tarjetas.js';

const API_URL = '/api/crud';
const PATH_PRODUCTOS = 'data/productos.json';

let productos = [];
const catalogo = document.getElementById('catalogo');

async function cargarProductos() {
    try {
        catalogo.innerHTML = Array(6).fill('<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>').join('');

        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET', path: PATH_PRODUCTOS })
        });
        const json = await respuesta.json();
        if (!json.success || !Array.isArray(json.data)) throw new Error('Error');
        productos = json.data.filter(p => p.activo !== false);
        renderizarFavoritos();
    } catch (error) {
        console.error('Error:', error);
        catalogo.innerHTML = '<div class="sin-resultados">No se pudieron cargar los productos.</div>';
    }
}

function renderizarFavoritos() {
    const favs = obtenerFavoritos();
    const listaFavs = productos.filter(p => favs.includes(p.slug));

    if (listaFavs.length === 0) {
        catalogo.innerHTML = '<div class="favoritos-vacio"><i class="fa-regular fa-heart" style="font-size:48px;color:#ddd"></i><h3>Aún no tienes favoritos</h3><p>Explora el catálogo y toca el corazón en los productos que te gusten.</p><a href="/index.html" class="btn-ir-catalogo"><i class="fa-solid fa-store"></i> Ir al catálogo</a></div>';
        return;
    }

    catalogo.innerHTML = listaFavs.map(p => crearTarjeta(p)).join('');
    activarGalerias();
    activarTarjetas();
}

const drawerCart = document.getElementById('drawer-cart');
const overlay = document.getElementById('overlay');
const btnCart = document.getElementById('btnCart');
const navCart = document.getElementById('navCart');

function abrirCarrito() {
    drawerCart.classList.add('open');
    overlay.classList.add('active');
    renderizarCarrito();
}

function cerrarDrawers() {
    drawerCart.classList.remove('open');
    overlay.classList.remove('active');
}

if (btnCart) btnCart.addEventListener('click', abrirCarrito);
if (navCart) navCart.addEventListener('click', abrirCarrito);
if (overlay) overlay.addEventListener('click', cerrarDrawers);
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', cerrarDrawers);
});
const btnCheckout = document.getElementById('btnCheckout');
if (btnCheckout) btnCheckout.addEventListener('click', enviarCarritoWhatsApp);

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
    new MutationObserver(sincronizarBadges).observe(badge1, { attributes: true, childList: true, characterData: true, subtree: true });
}

actualizarBadgeCarrito();
actualizarBadgeFavoritos();
activarCarritoBotones();
cargarProductos();
