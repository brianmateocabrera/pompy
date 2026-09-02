/* ------------------------------------------
   INDEX-TARJETAS.JS
   Utilidades, renderizado de tarjetas y galerías
------------------------------------------ */

export const WHATSAPP_NUMERO = '5493518189444';

export function escaparHTML(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function formatearPrecio(valor) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(Number(valor) || 0);
}

export function obtenerImagenPrincipal(producto) {
    return producto.imagenPrincipal ||
        producto.imagenes?.[0]?.url ||
        producto.imagen ||
        '/imagenes/no-image.webp';
}

/* ---------- FAVORITOS (localStorage) ---------- */

function obtenerFavoritos() {
    try {
        return JSON.parse(localStorage.getItem('pompy-favoritos') || '[]');
    } catch {
        return [];
    }
}

function guardarFavoritos(lista) {
    localStorage.setItem('pompy-favoritos', JSON.stringify(lista));
}

function esFavorito(slug) {
    return obtenerFavoritos().includes(slug);
}

export function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

export function toggleFav(slug) {
    if (!slug) return;
    let favs = obtenerFavoritos();
    const eraFav = favs.includes(slug);
    if (eraFav) {
        favs = favs.filter(s => s !== slug);
        mostrarToast('Quitado de favoritos');
    } else {
        favs.push(slug);
        mostrarToast('Agregado a favoritos');
    }
    guardarFavoritos(favs);
    actualizarBadgeFavoritos();
    document.querySelectorAll(`.card[data-slug="${slug}"] .btn-fav`).forEach(btn => {
        const activo = favs.includes(slug);
        btn.classList.toggle('activo', activo);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = activo ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
    });
    document.querySelectorAll('.btn-fav-producto').forEach(btn => {
        if (btn.dataset.slug === slug) {
            btn.classList.toggle('activo', !eraFav);
        }
    });
}

export function actualizarBadgeFavoritos() {
    const badge = document.getElementById('favBadge');
    const count = obtenerFavoritos().length;
    if (badge) {
        badge.textContent = count > 0 ? String(count) : '';
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

/* ---------- CARRITO (localStorage) ---------- */

export function obtenerCarrito() {
    try {
        return JSON.parse(localStorage.getItem('pompy-carrito') || '[]');
    } catch {
        return [];
    }
}

export function guardarCarrito(lista) {
    localStorage.setItem('pompy-carrito', JSON.stringify(lista));
}

export function addToCart(producto) {
    let carrito = obtenerCarrito();
    const existente = carrito.find(item => item.slug === producto.slug);
    if (existente) {
        existente.cantidad = (existente.cantidad || 1) + 1;
    } else {
        carrito.push({
            slug: producto.slug,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: obtenerImagenPrincipal(producto),
            cantidad: 1
        });
    }
    guardarCarrito(carrito);
    actualizarBadgeCarrito();
    animarBadgeCarrito();
    mostrarToast(existente ? 'Cantidad actualizada en el carrito' : 'Producto agregado al carrito');
}

export function animarBadgeCarrito() {
    document.querySelectorAll('.badge-contador').forEach(badge => {
        if (badge.id === 'favBadge') return;
        badge.classList.remove('badge-pop');
        void badge.offsetWidth;
        badge.classList.add('badge-pop');
    });
}

export function removeFromCart(slug) {
    let carrito = obtenerCarrito().filter(item => item.slug !== slug);
    guardarCarrito(carrito);
    actualizarBadgeCarrito();
    renderizarCarrito();
}

export function cambiarCantidadCarrito(slug, delta) {
    let carrito = obtenerCarrito();
    const item = carrito.find(i => i.slug === slug);
    if (item) {
        item.cantidad = Math.max(1, (item.cantidad || 1) + delta);
    }
    guardarCarrito(carrito);
    actualizarBadgeCarrito();
    renderizarCarrito();
}

export function actualizarBadgeCarrito() {
    const badge = document.getElementById('cartBadge');
    const carrito = obtenerCarrito();
    const count = carrito.reduce((sum, item) => sum + (item.cantidad || 1), 0);
    if (badge) {
        badge.textContent = count > 0 ? String(count) : '';
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

export function renderizarCarrito() {
    const contenedor = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!contenedor) return;

    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        contenedor.innerHTML = '<p class="cart-vacio">Tu carrito está vacío</p>';
        if (totalEl) totalEl.textContent = formatearPrecio(0);
        return;
    }

    let total = 0;
    contenedor.innerHTML = carrito.map(item => {
        const subtotal = (Number(item.precio) || 0) * (item.cantidad || 1);
        total += subtotal;
        return `
            <div class="cart-item">
                <img src="${escaparHTML(item.imagen)}" alt="${escaparHTML(item.nombre)}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4>${escaparHTML(item.nombre)}</h4>
                    <p class="cart-item-precio">${formatearPrecio(item.precio)}</p>
                    <div class="cart-item-cantidad">
                        <button class="btn-cantidad" data-action="restar" data-slug="${escaparHTML(item.slug)}" aria-label="Restar">-</button>
                        <span>${item.cantidad || 1}</span>
                        <button class="btn-cantidad" data-action="sumar" data-slug="${escaparHTML(item.slug)}" aria-label="Sumar">+</button>
                    </div>
                </div>
                <button class="cart-item-eliminar" data-action="eliminar" data-slug="${escaparHTML(item.slug)}" aria-label="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    if (totalEl) totalEl.textContent = formatearPrecio(total);

    activarCarritoBotones();
}

export function enviarCarritoWhatsApp() {
    const carrito = obtenerCarrito();
    if (carrito.length === 0) return;

    const inputNombre = document.getElementById('checkoutNombre');
    const inputDireccion = document.getElementById('checkoutDireccion');
    const nombre = inputNombre ? inputNombre.value.trim() : '';
    const direccion = inputDireccion ? inputDireccion.value.trim() : '';

    let mensaje = 'Hola! Quiero hacer el siguiente pedido:\n\n';

    if (nombre) mensaje += `Nombre: ${nombre}\n`;
    if (direccion) mensaje += `Dirección: ${direccion}\n`;
    if (nombre || direccion) mensaje += '\n';

    carrito.forEach(item => {
        mensaje += `*${item.nombre}* x${item.cantidad || 1} - ${formatearPrecio((Number(item.precio) || 0) * (item.cantidad || 1))}\n`;
    });
    const total = carrito.reduce((sum, item) => sum + (Number(item.precio) || 0) * (item.cantidad || 1), 0);
    mensaje += `\n*Total: ${formatearPrecio(total)}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

export function activarCarritoBotones() {
    const contenedor = document.getElementById('cartItems');
    if (!contenedor) return;
    contenedor.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const slug = btn.dataset.slug;
            if (action === 'sumar') cambiarCantidadCarrito(slug, 1);
            else if (action === 'restar') cambiarCantidadCarrito(slug, -1);
            else if (action === 'eliminar') removeFromCart(slug);
        });
    });
}

/* ---------- CREAR TARJETA ---------- */

export function crearTarjeta(producto) {
    const nombre = escaparHTML(producto.nombre);
    const imagenPrincipal = escaparHTML(obtenerImagenPrincipal(producto));
    const precio = formatearPrecio(producto.precio);
    const slug = escaparHTML(producto.slug || '');

    const tienePrecioAnterior =
        producto.precioAnterior !== null &&
        producto.precioAnterior !== undefined &&
        producto.precioAnterior !== '' &&
        Number(producto.precioAnterior) > Number(producto.precio);

    const precioAnterior = tienePrecioAnterior
        ? `<span class="precio-anterior">${formatearPrecio(producto.precioAnterior)}</span>`
        : '';

    const stock = Number(producto.stock) || 0;

    const badges = Array.isArray(producto.badges)
        ? producto.badges.filter(Boolean).map(badge =>
            `<span class="badge">${escaparHTML(badge)}</span>`
        ).join('')
        : '';

    const sinStock = stock <= 0
        ? `<span class="badge badge-sin-stock">Sin stock</span>`
        : '';

    const favActivo = esFavorito(producto.slug) ? ' activo' : '';

    const mensajeWhatsApp = encodeURIComponent(
        `Hola, quisiera consultar por este producto: ${producto.nombre}`
    );

    const cartData = escaparHTML(JSON.stringify({
        slug: producto.slug,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: obtenerImagenPrincipal(producto)
    }));

    return `
        <article class="card" data-slug="${slug}" role="link" tabindex="0">
            <div class="imagen-contenedor">
                <img src="${imagenPrincipal}" class="card-img" alt="${nombre}" loading="lazy"
                    onerror="this.src='/imagenes/no-image.webp'">
                <div class="badge-contenedor">${badges}${sinStock}</div>

                <button class="btn-fav${favActivo}" data-fav-slug="${slug}" aria-label="Favorito">
                    <i class="fa-${favActivo.trim() ? 'solid' : 'regular'} fa-heart"></i>
                </button>
            </div>
            <div class="card-info">
                <h2 class="card-title">${nombre}</h2>
                <p class="card-price">
                    <span class="precio-actual">${precio}</span>${precioAnterior}
                </p>
                <div class="card-botones">
                    <a class="boton-whatsapp" href="https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWhatsApp}"
                        target="_blank" rel="noopener noreferrer"
                        aria-label="Consultar ${nombre} por WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i>
                    </a>
                    <button class="btn-add-cart" data-cart-producto="${cartData}" aria-label="Agregar al carrito">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </article>
    `;
}

export function activarTarjetas() {
    document.querySelectorAll('.card[data-slug]').forEach(card => {
        const abrir = () => {
            const slug = card.dataset.slug;
            if (!slug) return;
            window.location.href = `/producto.html?slug=${encodeURIComponent(slug)}`;
        };

        card.addEventListener('click', event => {
            if (event.target.closest('.boton-whatsapp')) return;
            if (event.target.closest('.btn-fav')) return;
            if (event.target.closest('.btn-add-cart')) return;
            abrir();
        });

        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                abrir();
            }
        });
    });

    document.querySelectorAll('.btn-fav[data-fav-slug]').forEach(btn => {
        btn.addEventListener('click', event => {
            event.stopPropagation();
            const slug = btn.dataset.favSlug;
            if (slug) toggleFav(slug);
        });
    });

    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', event => {
            event.stopPropagation();
            try {
                const producto = JSON.parse(btn.dataset.cartProducto);
                addToCart(producto);
            } catch (e) {
                console.error('Error al agregar al carrito:', e);
            }
        });
    });
}

export function activarGalerias() {
    document.querySelectorAll('.galeria-mini img').forEach(miniatura => {
        miniatura.addEventListener('click', () => {
            const contenedor = miniatura.closest('.card');
            const imagenPrincipal = contenedor.querySelector('.card-img');
            imagenPrincipal.src = miniatura.dataset.imagen;
        });
    });
}
