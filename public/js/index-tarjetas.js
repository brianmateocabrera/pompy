/* ------------------------------------------
   INDEX-TARJETAS.JS
   Utilidades, renderizado de tarjetas y galerías
   Extraído de index.js para modularidad
------------------------------------------ */

export const WHATSAPP_NUMERO = '5493518189444';

/* ------------------------------------------
   UTILIDADES
------------------------------------------ */

export function escaparHTML(texto) {

    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function formatearPrecio(valor) {

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

export function obtenerImagenPrincipal(producto) {

    return producto.imagenPrincipal ||
        producto.imagenes?.[0]?.url ||
        producto.imagen ||
        '/imagenes/no-image.webp';
}

/* ------------------------------------------
   TARJETA
------------------------------------------ */

export function crearTarjeta(producto) {

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
            data-slug="${escaparHTML
(producto.slug || '')}"
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

export function activarTarjetas() {

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
                            `/producto.html?slug=${encod
eURIComponent(slug)}`;
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

export function activarGalerias() {

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
