import {
    escaparHTML,
    formatearPrecio,
    WHATSAPP_NUMERO,
    obtenerCarrito,
    guardarCarrito,
    actualizarBadgeCarrito,
    actualizarBadgeFavoritos,
    renderizarCarrito,
    activarCarritoBotones
} from './index-tarjetas.js';

let descuentoAplicado = 0;
let cuponAplicado = '';

const CUPONES = {
    'POMPY10': 0.10,
    'POMPY15': 0.15,
    'BIENVENIDA': 0.05
};

const COSTO_ENVIO_DOMICILIO = 2500;

// Elementos de la página
const carritoItemsLista = document.getElementById('carritoItemsLista');
const carritoVacio = document.getElementById('carrito-vacio');
const paginaCarrito = document.getElementById('pagina-carrito');

const resumenSubtotal = document.getElementById('resumenSubtotal');
const resumenEnvio = document.getElementById('resumenEnvio');
const resumenDescuento = document.getElementById('resumenDescuento');
const resumenTotal = document.getElementById('resumenTotal');
const descuentoLinea = document.getElementById('descuentoLinea');

const cuponMensaje = document.getElementById('cuponMensaje');
const cuponInput = document.getElementById('cuponInput');
const btnAplicarCupon = document.getElementById('btnAplicarCupon');


// ============================================================
// CÁLCULOS
// ============================================================

function calcularSubtotal() {
    const carrito = obtenerCarrito();

    return carrito.reduce((sum, item) => {
        const precio = Number(item.precio) || 0;
        const cantidad = Number(item.cantidad) || 1;

        return sum + (precio * cantidad);
    }, 0);
}

function obtenerCostoEnvio() {
    const envioSeleccionado = document.querySelector(
        'input[name="envio"]:checked'
    );

    if (
        envioSeleccionado &&
        envioSeleccionado.value === 'domicilio'
    ) {
        return COSTO_ENVIO_DOMICILIO;
    }

    return 0;
}

function calcularDescuento() {
    const subtotal = calcularSubtotal();

    if (descuentoAplicado <= 0) {
        return 0;
    }

    return subtotal * descuentoAplicado;
}

function calcularTotal() {
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento();
    const envio = obtenerCostoEnvio();

    return subtotal - descuento + envio;
}


// ============================================================
// RENDERIZAR CARRITO PRINCIPAL
// ============================================================

function renderizarCarritoPagina() {
    if (!carritoItemsLista || !carritoVacio || !paginaCarrito) {
        return;
    }

    const carrito = obtenerCarrito();

    if (!Array.isArray(carrito) || carrito.length === 0) {
        paginaCarrito.style.display = 'none';
        carritoVacio.style.display = 'flex';

        actualizarResumen();

        return;
    }

    paginaCarrito.style.display = 'block';
    carritoVacio.style.display = 'none';

    carritoItemsLista.innerHTML = carrito.map(item => {
        const img = item.imagen || '/imagenes/no-image.webp';
        const cantidad = Number(item.cantidad) || 1;
        const precio = Number(item.precio) || 0;
        const subtotalItem = precio * cantidad;

        return `
            <div
                class="carrito-item-pagina"
                data-slug="${escaparHTML(item.slug || '')}"
            >
                <img
                    src="${escaparHTML(img)}"
                    alt="${escaparHTML(item.nombre || 'Producto')}"
                    class="carrito-item-img"
                    loading="lazy"
                >

                <div class="carrito-item-info">
                    <h3 class="carrito-item-nombre">
                        ${escaparHTML(item.nombre || 'Producto')}
                    </h3>

                    <div class="carrito-item-precio">
                        ${formatearPrecio(precio)}
                    </div>

                    <div class="carrito-item-controles">
                        <button
                            class="btn-cantidad"
                            data-action="restar"
                            type="button"
                            aria-label="Disminuir cantidad"
                        >
                            <i class="fa-solid fa-minus"></i>
                        </button>

                        <span class="carrito-item-cantidad">
                            ${cantidad}
                        </span>

                        <button
                            class="btn-cantidad"
                            data-action="sumar"
                            type="button"
                            aria-label="Aumentar cantidad"
                        >
                            <i class="fa-solid fa-plus"></i>
                        </button>

                        <button
                            class="btn-eliminar"
                            data-action="eliminar"
                            type="button"
                            aria-label="Eliminar producto"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>

                    <div class="carrito-item-subtotal">
                        ${formatearPrecio(subtotalItem)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    activarBotonesCarritoPagina();
    actualizarResumen();
}


// ============================================================
// BOTONES DEL CARRITO PRINCIPAL
// ============================================================

function activarBotonesCarritoPagina() {
    if (!carritoItemsLista) {
        return;
    }

    document
        .querySelectorAll('.carrito-item-pagina')
        .forEach(itemEl => {
            const slug = itemEl.dataset.slug;

            itemEl
                .querySelectorAll('button[data-action]')
                .forEach(btn => {
                    btn.addEventListener('click', () => {
                        const carrito = obtenerCarrito();

                        const item = carrito.find(
                            producto => producto.slug === slug
                        );

                        if (!item) {
                            return;
                        }

                        const action = btn.dataset.action;
                        const cantidadActual =
                            Number(item.cantidad) || 1;

                        if (action === 'sumar') {
                            item.cantidad = cantidadActual + 1;
                        }

                        if (action === 'restar') {
                            item.cantidad = cantidadActual - 1;

                            if (item.cantidad <= 0) {
                                const index = carrito.findIndex(
                                    producto => producto.slug === slug
                                );

                                if (index !== -1) {
                                    carrito.splice(index, 1);
                                }
                            }
                        }

                        if (action === 'eliminar') {
                            const index = carrito.findIndex(
                                producto => producto.slug === slug
                            );

                            if (index !== -1) {
                                carrito.splice(index, 1);
                            }
                        }

                        guardarCarrito(carrito);
                        actualizarBadgeCarrito();

                        // Actualizar también el drawer.
                        renderizarCarrito();

                        // Actualizar la vista principal.
                        renderizarCarritoPagina();
                    });
                });
        });
}


// ============================================================
// RESUMEN
// ============================================================

function actualizarResumen() {
    if (
        !resumenSubtotal ||
        !resumenEnvio ||
        !resumenDescuento ||
        !resumenTotal ||
        !descuentoLinea
    ) {
        return;
    }

    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento();
    const envio = obtenerCostoEnvio();
    const total = subtotal - descuento + envio;

    resumenSubtotal.textContent =
        formatearPrecio(subtotal);

    if (envio > 0) {
        resumenEnvio.textContent =
            formatearPrecio(envio);
    } else {
        resumenEnvio.textContent = 'Gratis';
    }

    if (descuento > 0) {
        descuentoLinea.style.display = 'flex';

        resumenDescuento.textContent =
            '-' + formatearPrecio(descuento);
    } else {
        descuentoLinea.style.display = 'none';
        resumenDescuento.textContent =
            formatearPrecio(0);
    }

    resumenTotal.textContent =
        formatearPrecio(total);
}


// ============================================================
// CUPONES
// ============================================================

if (btnAplicarCupon) {
    btnAplicarCupon.addEventListener('click', () => {
        if (!cuponInput || !cuponMensaje) {
            return;
        }

        const codigo = cuponInput.value
            .trim()
            .toUpperCase();

        if (!codigo) {
            descuentoAplicado = 0;
            cuponAplicado = '';

            cuponMensaje.textContent =
                'Ingresá un código.';

            cuponMensaje.className =
                'cupon-mensaje error';

            actualizarResumen();

            return;
        }

        if (Object.prototype.hasOwnProperty.call(CUPONES, codigo)) {
            descuentoAplicado = CUPONES[codigo];
            cuponAplicado = codigo;

            cuponMensaje.textContent =
                '¡Cupón aplicado! ' +
                (descuentoAplicado * 100) +
                '% de descuento.';

            cuponMensaje.className =
                'cupon-mensaje exito';
        } else {
            descuentoAplicado = 0;
            cuponAplicado = '';

            cuponMensaje.textContent =
                'Código no válido.';

            cuponMensaje.className =
                'cupon-mensaje error';
        }

        actualizarResumen();
    });
}


// ============================================================
// CAMBIO DE MÉTODO DE ENVÍO
// ============================================================

document
    .querySelectorAll('input[name="envio"]')
    .forEach(radio => {
        radio.addEventListener(
            'change',
            actualizarResumen
        );
    });


// ============================================================
// WHATSAPP - CARRITO PRINCIPAL
// ============================================================

function enviarPedidoPaginaWhatsApp() {
    const carrito = obtenerCarrito();

    if (!Array.isArray(carrito) || carrito.length === 0) {
        alert('El carrito está vacío.');
        return;
    }

    const nombreInput =
        document.getElementById('checkoutNombrePagina');

    const direccionInput =
        document.getElementById('checkoutDireccionPagina');

    const nombre =
        nombreInput?.value.trim() || '';

    const direccion =
        direccionInput?.value.trim() || '';

    if (!nombre) {
        alert('Ingresá tu nombre.');
        nombreInput?.focus();

        return;
    }

    const envioSeleccionado =
        document.querySelector(
            'input[name="envio"]:checked'
        );

    const envioDomicilio =
        envioSeleccionado?.value === 'domicilio';

    if (envioDomicilio && !direccion) {
        alert('Ingresá tu dirección de envío.');
        direccionInput?.focus();

        return;
    }

    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento();
    const envio = obtenerCostoEnvio();
    const total = subtotal - descuento + envio;

    let mensaje =
        'Hola, quiero realizar un pedido en POMPY.\n\n';

    mensaje += `Nombre: ${nombre}\n`;

    if (envioDomicilio) {
        mensaje += 'Envío: Domicilio\n';
        mensaje += `Dirección: ${direccion}\n`;
    } else {
        mensaje += 'Envío: Retiro\n';
    }

    mensaje += '\nProductos:\n';

    carrito.forEach(item => {
        const cantidad =
            Number(item.cantidad) || 1;

        const precio =
            Number(item.precio) || 0;

        const subtotalItem =
            precio * cantidad;

        mensaje +=
            `- ${item.nombre} x${cantidad}: ` +
            `${formatearPrecio(subtotalItem)}\n`;
    });

    mensaje +=
        `\nSubtotal: ${formatearPrecio(subtotal)}`;

    if (descuento > 0) {
        mensaje +=
            `\nDescuento (${cuponAplicado}): -` +
            `${formatearPrecio(descuento)}`;
    }

    mensaje +=
        `\nEnvío: ${formatearPrecio(envio)}`;

    mensaje +=
        `\nTotal: ${formatearPrecio(total)}`;

    const url =
        `https://wa.me/${WHATSAPP_NUMERO}` +
        `?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
}


// ============================================================
// CHECKOUT PRINCIPAL
// ============================================================

const btnCheckoutPagina =
    document.getElementById('btnCheckoutPagina');

if (btnCheckoutPagina) {
    btnCheckoutPagina.addEventListener(
        'click',
        enviarPedidoPaginaWhatsApp
    );
}


// ============================================================
// DRAWER DEL CARRITO
// ============================================================

const drawerCart =
    document.getElementById('drawer-cart');

const overlay =
    document.getElementById('overlay');

const btnCart =
    document.getElementById('btnCart');

function abrirCarrito() {
    if (drawerCart) {
        drawerCart.classList.add('open');
    }

    if (overlay) {
        overlay.classList.add('active');
    }

    renderizarCarrito();
}

function cerrarDrawers() {
    if (drawerCart) {
        drawerCart.classList.remove('open');
    }

    if (overlay) {
        overlay.classList.remove('active');
    }
}

if (btnCart) {
    btnCart.addEventListener(
        'click',
        abrirCarrito
    );
}

if (overlay) {
    overlay.addEventListener(
        'click',
        cerrarDrawers
    );
}

document
    .querySelectorAll('[data-close]')
    .forEach(btn => {
        btn.addEventListener(
            'click',
            cerrarDrawers
        );
    });


// ============================================================
// CHECKOUT DEL DRAWER
// ============================================================

const btnCheckout =
    document.getElementById('btnCheckout');

if (btnCheckout) {
    btnCheckout.addEventListener(
        'click',
        enviarCarritoWhatsApp
    );
}


// ============================================================
// BADGES
// ============================================================

function sincronizarBadges() {
    const badge1 =
        document.getElementById('cartBadge');

    const badge2 =
        document.getElementById('cartBadge2');

    if (badge1 && badge2) {
        badge2.textContent =
            badge1.textContent;

        badge2.style.display =
            badge1.style.display;
    }
}

const badge1 =
    document.getElementById('cartBadge');

if (badge1) {
    new MutationObserver(sincronizarBadges)
        .observe(
            badge1,
            {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            }
        );
}


// ============================================================
// INICIALIZACIÓN
// ============================================================

actualizarBadgeCarrito();
actualizarBadgeFavoritos();
activarCarritoBotones();
renderizarCarritoPagina();