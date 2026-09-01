/* ==========================================
   INDEX-DESTACADOS.JS
   Productos destacados: renderizado, galerías y arrastre
========================================== */

import { crearTarjeta } from './index-tarjetas.js';

export function renderizarDestacados(productos, destacados) {
    if (!destacados) return;

    const lista = productos.filter(producto => producto.destacado === true);

    if (!lista.length) {
        destacados.innerHTML = '';
        return;
    }

    const tarjetas = lista.map(producto => crearTarjeta(producto)).join('');

    destacados.innerHTML = `
        <div class="destacados-header">
            <h2 class="destacados-titulo">Destacados</h2>
        </div>
        <div class="destacados-track" tabindex="0">${tarjetas}</div>
    `;

    activarGaleriasDestacados(destacados);
    activarTarjetasDestacados(destacados);
    activarArrastreDestacados(destacados);
}

function activarGaleriasDestacados(destacados) {
    destacados.querySelectorAll('.galeria-mini img').forEach(miniatura => {
        miniatura.addEventListener('click', event => {
            event.stopPropagation();
            const contenedor = miniatura.closest('.card');
            const imagenPrincipal = contenedor.querySelector('.card-img');
            imagenPrincipal.src = miniatura.dataset.imagen;
        });
    });
}

function activarTarjetasDestacados(destacados) {
    destacados.querySelectorAll('.card[data-slug]').forEach(card => {
        const abrir = () => {
            const slug = card.dataset.slug;
            if (!slug) return;
            window.location.href = `/producto.html?slug=${encodeURIComponent(slug)}`;
        };

        card.addEventListener('click', event => {
            if (event.target.closest('.boton-whatsapp')) return;
            if (card.dataset.arrastrado === 'true') {
                card.dataset.arrastrado = 'false';
                return;
            }
            abrir();
        });

        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                abrir();
            }
        });
    });
}

function activarArrastreDestacados(destacados) {
    const track = destacados.querySelector('.destacados-track');
    if (!track) return;

    let arrastrando = false;
    let inicioX = 0;
    let scrollInicial = 0;
    let movimiento = false;

    track.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        arrastrando = true;
        movimiento = false;
        inicioX = event.clientX;
        scrollInicial = track.scrollLeft;
        track.classList.add('arrastrando');
        track.setPointerCapture(event.pointerId);
    });

    track.addEventListener('pointermove', event => {
        if (!arrastrando) return;
        const desplazamiento = event.clientX - inicioX;
        if (Math.abs(desplazamiento) > 5) movimiento = true;
        track.scrollLeft = scrollInicial - desplazamiento;
        if (movimiento) {
            track.querySelectorAll('.card').forEach(card => {
                card.dataset.arrastrado = 'true';
            });
        }
    });

    const finalizarArrastre = event => {
        if (!arrastrando) return;
        arrastrando = false;
        track.classList.remove('arrastrando');
        if (track.hasPointerCapture(event.pointerId)) {
            track.releasePointerCapture(event.pointerId);
        }
        if (movimiento) {
            setTimeout(() => {
                track.querySelectorAll('.card').forEach(card => {
                    card.dataset.arrastrado = 'false';
                });
            }, 0);
        }
    };

    track.addEventListener('pointerup', finalizarArrastre);
    track.addEventListener('pointercancel', finalizarArrastre);
}
