import {
    escaparHTML,
    formatearPrecio,
    WHATSAPP_NUMERO,
    obtenerCarrito,
    guardarCarrito,
    actualizarBadgeCarrito,
    actualizarBadgeFavoritos,
    renderizarCarrito,
    activarCarritoBotones,
    enviarCarritoWhatsApp,
    obtenerImagenPrincipal
} from './index-tarjetas.js';

let descuentoAplicado = 0;
let cuponAplicado = '';

const CUPONES = {
    'POMPY10': 0.10,
    'POMPY15': 0.15,
    'BIENVENIDA': 0.05
};
const COSTO_ENVIO_DOMICILIO = 2500;

const carritoItemsLista = document.getElementById('carritoItemsLista');
const carritoVacio = document.getElementById('carrito-vacio');
const paginaCarrito = document.getElementById('pagina-carrito');
const resumenSubtotal = document.getElementById('resumenSubtotal');
const resumenEnvio = document.getElementById('resumenEnvio');
const resumenDescuento = document.getElementById('resumenDescuento');
const resumenTotal = document.getElementById('resumenTotal');
const descuentoLinea = document.getElementById('descuentoLinea');
const cuponMensaje = document.getElementById('cuponMensaje');

function calcularSubtotal() {
    const carrito = obtenerCarrito();
    return carrito.reduce((sum, item) => sum + (item.precio * (item.cantidad || 1)), 0);
}

function calcularTotal() {
    let total = calcularSubtotal();
    const envioSeleccionado = document.querySelector('input[name="envio"]:checked');
    let costoEnvio = 0;
    if (envioSeleccionado && envioSeleccionado.value === 'domicilio') {
        costoEnvio = COSTO_ENVIO_DOMICILIO;
    }
    total += costoEnvio;
    if (descuentoAplicado > 0) {
        total = total - (total * descuentoAplicado);
    }
    return total;
}

function renderizarCarritoPagina() {
    const carrito = obtenerCarrito();
    if (carrito.length === 0) {
        paginaCarrito.style.display = 'none';
        carritoVacio.style.display = 'flex';
        return;
    }
    paginaCarrito.style.display = 'block';
    carritoVacio.style.display = 'none';

    carritoItemsLista.innerHTML = carrito.map(item => {
        const img = item.imagen || '/imagenes/no-image.webp';
        const subtotalItem = (item.precio * (item.cantidad || 1));
        return '<div class="carrito-item-pagina" data-slug="' + escaparHTML(item.slug) + '">' +
            '<img src="' + escaparHTML(img) + '" alt="' + escaparHTML(item.nombre) + '" class="carrito-item-img" loading="lazy">' +
            '<div class="carrito-item-info">' +
                '<h3 class="carrito-item-nombre">' + escaparHTML(item.nombre) + '</h3>' +
                '<div class="carrito-item-precio">' + formatearPrecio(item.precio) + '</div>' +
                '<div class="carrito-item-controles">' +
                    '<button class="btn-cantidad" data-action="restar"><i class="fa-solid fa-minus"></i></button>' +
                    '<span class="carrito-item-cantidad">' + (item.cantidad || 1) + '</span>' +
                    '<button class="btn-cantidad" data-action="sumar"><i class="fa-solid fa-plus"></i></button>' +
                    '<button class="btn-eliminar" data-action="eliminar"><i class="fa-solid fa-trash"></i></button>' +
                '</div>' +
                '<div class="carrito-item-subtotal">' + formatearPrecio(subtotalItem) + '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    activarBotonesCarritoPagina();
    actualizarResumen();
}

function activarBotonesCarritoPagina() {
    document.querySelectorAll('.carrito-item-pagina').forEach(itemEl => {
        const slug = itemEl.dataset.slug;
        itemEl.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const carrito = obtenerCarrito();
                const item = carrito.find(i => i.slug === slug);
                if (!item) return;
                const action = btn.dataset.action;
                if (action === 'sumar') {
                    item.cantidad = (item.cantidad || 1) + 1;
                } else if (action === 'restar') {
                    item.cantidad = (item.cantidad || 1) - 1;
                    if (item.cantidad <= 0) {
                        const idx = carrito.findIndex(i => i.slug === slug);
                        carrito.splice(idx, 1);
                    }
                } else if (action === 'eliminar') {
                    const idx = carrito.findIndex(i => i.slug === slug);
                    carrito.splice(idx, 1);
                }
                guardarCarrito(carrito);
                actualizarBadgeCarrito();
                renderizarCarritoPagina();
            });
        });
    });
}

function actualizarResumen() {
    const subtotal = calcularSubtotal();
    resumenSubtotal.textContent = formatearPrecio(subtotal);
    const envioSeleccionado = document.querySelector('input[name="envio"]:checked');
    if (envioSeleccionado && envioSeleccionado.value === 'domicilio') {
        resumenEnvio.textContent = formatearPrecio(COSTO_ENVIO_DOMICILIO);
    } else {
        resumenEnvio.textContent = 'Gratis';
    }
    if (descuentoAplicado > 0) {
        descuentoLinea.style.display = 'flex';
        resumenDescuento.textContent = '-' + formatearPrecio(subtotal * descuentoAplicado);
    } else {
        descuentoLinea.style.display = 'none';
    }
    resumenTotal.textContent = formatearPrecio(calcularTotal());
}

const btnAplicarCupon = document.getElementById('btnAplicarCupon');
const cuponInput = document.getElementById('cuponInput');
if (btnAplicarCupon) {
    btnAplicarCupon.addEventListener('click', () => {
        const codigo = cuponInput.value.trim().toUpperCase();
        if (!codigo) {
            cuponMensaje.textContent = 'Ingresa un código';
            cuponMensaje.className = 'cupon-mensaje error';
            return;
        }
        if (CUPONES[codigo]) {
            descuentoAplicado = CUPONES[codigo];
            cuponAplicado = codigo;
            cuponMensaje.textContent = '¡Cupón aplicado! ' + (descuentoAplicado * 100) + '% de descuento';
            cuponMensaje.className = 'cupon-mensaje exito';
        } else {
            descuentoAplicado = 0;
            cuponMensaje.textContent = 'Código no válido';
            cuponMensaje.className = 'cupon-mensaje error';
        }
        actualizarResumen();
    });
}

document.querySelectorAll('input[name="envio"]').forEach(radio => {
    radio.addEventListener('change', actualizarResumen);
});

const btnCheckoutPagina = document.getElementById('btnCheckoutPagina');
if (btnCheckoutPagina) {
    btnCheckoutPagina.addEventListener('click', () => {
        const nombreInput = document.getElementById('checkoutNombrePagina');
        const dirInput = document.getElementById('checkoutDireccionPagina');
        if (nombreInput) {
            const nombreEl = document.getElementById('checkoutNombre');
            if (nombreEl) nombreEl.value = nombreInput.value;
        }
        if (dirInput) {
            const dirEl = document.getElementById('checkoutDireccion');
            if (dirEl) dirEl.value = dirInput.value;
        }
        enviarCarritoWhatsApp();
    });
}

const drawerCart = document.getElementById('drawer-cart');
const overlay = document.getElementById('overlay');
const btnCart = document.getElementById('btnCart');
function abrirCarrito() {
    if (drawerCart) drawerCart.classList.add('open');
    if (overlay) overlay.classList.add('active');
    renderizarCarrito();
}
function cerrarDrawers() {
    if (drawerCart) drawerCart.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}
if (btnCart) btnCart.addEventListener('click', abrirCarrito);
if (overlay) overlay.addEventListener('click', cerrarDrawers);
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', cerrarDrawers));
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
if (badge1) new MutationObserver(sincronizarBadges).observe(badge1, { attributes: true, childList: true, characterData: true, subtree: true });

actualizarBadgeCarrito();
actualizarBadgeFavoritos();
activarCarritoBotones();
renderizarCarritoPagina();
