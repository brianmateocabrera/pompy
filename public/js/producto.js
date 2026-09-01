/* ------------------------------------------
   PRODUCTO.JS
   Lógica de la vista individual de producto
------------------------------------------ */

import {
    escaparHTML,
    formatearPrecio,
    WHATSAPP_NUMERO,
    addToCart,
    actualizarBadgeCarrito,
    renderizarCarrito,
    activarCarritoBotones,
    enviarCarritoWhatsApp,
    obtenerCarrito
} from './index-tarjetas.js';

const API_URL = '/api/crud';
const PATH_JSON = 'data/productos.json';

function obtenerSlug() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get('slug');
}

async function cargarProductos() {
    const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET', path: PATH_JSON })
    });

    const json = await respuesta.json();

    if (!respuesta.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || 'No se pudo cargar el catálogo.');
    }

    return json.data;
}

function obtenerImagen(producto) {
    if (producto.imagenPrincipal) return producto.imagenPrincipal;
    if (producto.imagenes && Array.isArray(producto.imagenes)) {
        const imagen = producto.imagenes.find(item => item && item.url);
        if (imagen) return imagen.url;
    }
    return producto.imagen || '/imagenes/no-image.webp';
}

function obtenerImagenes(producto) {
    if (Array.isArray(producto.imagenes)) {
        const imagenes = producto.imagenes.filter(imagen => imagen && imagen.url);
        if (imagenes.length) return imagenes;
    }
    const imagen = obtenerImagen(producto);
    return [{ url: imagen, alt: producto.nombre || '' }];
}

function obtenerCategorias(producto) {
    if (Array.isArray(producto.categoria)) return producto.categoria;
    if (producto.categoria) return [producto.categoria];
    return [];
}

function generarLinkWhatsApp(producto) {
    const nombre = producto.nombre || 'producto';
    const texto = `Hola, quiero consultar por el producto "${nombre}".`;
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
}

function renderizarBadges(producto, stock) {
    const badges = [];
    if (producto.destacado) badges.push('<span class="badge destacado">Destacado</span>');
    if (Array.isArray(producto.badges)) {
        producto.badges.forEach(badge => {
            badges.push(`<span class="badge">${escaparHTML(badge)}</span>`);
        });
    }
    if (stock <= 0) badges.push('<span class="badge sin-stock">Sin stock</span>');
    if (!badges.length) return '';
    return `<div class="badges">${badges.join('')}</div>`;
}

function renderizarMeta(producto, stock) {
    const categorias = obtenerCategorias(producto);
    const talles = Array.isArray(producto.talles) ? producto.talles.join(', ') : '';
    const colores = Array.isArray(producto.colores) ? producto.colores.join(', ') : '';
    const tags = Array.isArray(producto.tags) ? producto.tags.join(', ') : '';

    return `
        <div class="meta">
            <p><strong>Stock:</strong> ${stock > 0 ? stock : 'Sin stock'}</p>
            ${categorias.length ? `<p><strong>Categoría:</strong> ${escaparHTML(categorias.join(', '))}</p>` : ''}
            ${talles ? `<p><strong>Talles:</strong> ${escaparHTML(talles)}</p>` : ''}
            ${colores ? `<p><strong>Colores:</strong> ${escaparHTML(colores)}</p>` : ''}
            ${tags ? `<p><strong>Tags:</strong> ${escaparHTML(tags)}</p>` : ''}
        </div>
    `;
}

function renderizarGaleria(producto) {
    const imagenes = obtenerImagenes(producto);
    const principal = obtenerImagen(producto);

    const miniaturas = imagenes.map(imagen => `
        <img src="${escaparHTML(imagen.url)}" alt="${escaparHTML(imagen.alt || producto.nombre)}"
            class="miniatura ${imagen.url === principal ? 'activa' : ''}" data-url="${escaparHTML(imagen.url)}">
    `).join('');

    return `
        <div class="imagen-principal-contenedor">
            <img id="imagenPrincipal" src="${escaparHTML(principal)}" class="imagen-principal"
                alt="${escaparHTML(producto.nombre)}" onerror="this.src='/imagenes/no-image.webp'">
        </div>
        ${imagenes.length > 1 ? `<div class="galeria">${miniaturas}</div>` : ''}
    `;
}

function renderizarRelacionados(producto, productos) {
    const categorias = obtenerCategorias(producto);

    const relacionados = productos
        .filter(item => item.activo !== false && item.slug !== producto.slug)
        .filter(item => {
            const categoriasItem = obtenerCategorias(item);
            return categorias.some(categoria => categoriasItem.includes(categoria));
        })
        .slice(0, 4);

    if (!relacionados.length) return '';

    const tarjetas = relacionados.map(item => {
        const imagen = obtenerImagen(item);
        return `
            <a class="relacionado" href="/producto.html?slug=${encodeURIComponent(item.slug)}">
                <img class="relacionado-imagen" src="${escaparHTML(imagen)}"
                    alt="${escaparHTML(item.nombre)}" onerror="this.src='/imagenes/no-image.webp'">
                <div class="relacionado-info">
                    <h3 class="relacionado-nombre">${escaparHTML(item.nombre)}</h3>
                    <p class="relacionado-precio">${formatearPrecio(item.precio)}</p>
                </div>
            </a>
        `;
    }).join('');

    return `
        <section class="relacionados">
            <h2 class="relacionados-titulo">También te puede interesar</h2>
            <div class="relacionados-grid">${tarjetas}</div>
        </section>
    `;
}

function renderizarProducto(producto, productos) {
    const nombre = escaparHTML(producto.nombre);
    const descripcion = escaparHTML(producto.descripcion || 'Sin descripción disponible.');
    const stock = Number(producto.stock) || 0;
    const precio = formatearPrecio(producto.precio);

    const tienePrecioAnterior =
        producto.precioAnterior !== null &&
        producto.precioAnterior !== undefined &&
        producto.precioAnterior !== '' &&
        Number(producto.precioAnterior) > Number(producto.precio);

    const precioAnterior = tienePrecioAnterior
        ? `<span class="precio-anterior">${formatearPrecio(producto.precioAnterior)}</span>`
        : '';

    const whatsapp = generarLinkWhatsApp(producto);
    const badges = renderizarBadges(producto, stock);
    const meta = renderizarMeta(producto, stock);
    const relacionados = renderizarRelacionados(producto, productos);

    // Datos para el botón de carrito
    const cartData = escaparHTML(JSON.stringify({
        slug: producto.slug,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: obtenerImagen(producto)
    }));

    document.title = producto.nombre || 'Producto';

    // Layout reordenado: galería → precio + botones → descripción → meta
    document.getElementById('contenido').innerHTML = `
        <article class="producto">
            <section class="galeria-seccion">${renderizarGaleria(producto)}</section>
            <section class="informacion">
                ${badges}
                <h1>${nombre}</h1>
                <div class="precio-contenedor"><span class="precio">${precio}</span>${precioAnterior}</div>
                <div class="botones-accion">
                    <button class="boton-agregar" data-cart-producto="${cartData}" ${stock <= 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-cart-plus"></i> Agregar al carrito
                    </button>
                    <a href="${escaparHTML(whatsapp)}" class="boton-whatsapp" target="_blank" rel="noopener noreferrer">
                        <i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp
                    </a>
                </div>
                <p class="descripcion">${descripcion}</p>
                ${meta}
            </section>
        </article>
        ${relacionados}
    `;

    activarGaleria();
    activarBotonCarrito();

    // Actualizar badge al renderizar
    actualizarBadgeCarrito();
}

function activarBotonCarrito() {
    const btn = document.querySelector('.boton-agregar');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        try {
            const producto = JSON.parse(btn.dataset.cartProducto);
            addToCart(producto);
        } catch (e) {
            console.error('Error al agregar al carrito:', e);
        }
    });
}

function activarGaleria() {
    const principal = document.getElementById('imagenPrincipal');
    if (!principal) return;

    document.querySelectorAll('.miniatura').forEach(miniatura => {
        miniatura.addEventListener('click', () => {
            // Efecto de deslizamiento suave: opacidad → cambiar src → opacidad
            principal.style.opacity = '0';
            principal.style.transform = 'translateX(20px)';

            setTimeout(() => {
                principal.src = miniatura.dataset.url;
                principal.style.transform = 'translateX(-20px)';

                // Forzar reflow para que la transición funcue
                principal.offsetHeight;

                principal.style.transform = 'translateX(0)';
                principal.style.opacity = '1';
            }, 200);

            document.querySelectorAll('.miniatura').forEach(elemento => {
                elemento.classList.remove('activa');
            });
            miniatura.classList.add('activa');
        });
    });
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

// Eventos del header
document.getElementById('btnCart').addEventListener('click', abrirCarrito);
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', cerrarDrawers);
});
overlay.addEventListener('click', cerrarDrawers);
document.getElementById('btnCheckout').addEventListener('click', enviarCarritoWhatsApp);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cerrarDrawers();
});

// Re-renderizar carrito al abrir el drawer
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

/* ---------- ERRORES ---------- */

function mostrarError(mensaje) {
    document.getElementById('contenido').innerHTML = `
        <div class="error">
            <h2>${escaparHTML(mensaje)}</h2>
            <p><a href="/">Volver al catálogo</a></p>
        </div>
    `;
}

/* ---------- CARGAR PRODUCTO ---------- */

async function cargarProducto() {
    const slug = obtenerSlug();
    if (!slug) {
        mostrarError('No se indicó ningún producto.');
        return;
    }

    try {
        const productos = await cargarProductos();
        const producto = productos.find(item => item.slug === slug && item.activo !== false);
        if (!producto) {
            mostrarError('El producto no existe o no está disponible.');
            return;
        }
        renderizarProducto(producto, productos);
    } catch (error) {
        console.error('Error cargando producto:', error);
        mostrarError('Error al cargar el producto.');
    }
}

// Inicializar badge y cargar producto
actualizarBadgeCarrito();
cargarProducto();
