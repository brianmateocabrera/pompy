/* ==========================================
   INDEX-BANNERS.JS
   Banners: carga, renderizado y carrusel
========================================== */

import { escaparHTML } from './index-tarjetas.js';

let intervaloCarrusel = null;
let indiceBanner = 0;

export async function cargarBanners(bannersEl) {
    try {
        const respuesta = await fetch('/api/crud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET', path: 'data/banners.json' })
        });

        const json = await respuesta.json();

        if (!respuesta.ok || !json.success || !Array.isArray(json.data)) {
            throw new Error(json.error || 'No se pudieron cargar los banners.');
        }

        const activos = json.data
            .filter(banner => banner && banner.activo !== false && banner.imagen)
            .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));

        renderizarBanners(activos, bannersEl);
    } catch (error) {
        console.error('Error cargando banners:', error);
        if (bannersEl) bannersEl.innerHTML = '';
    }
}

function renderizarBanners(lista, bannersEl) {
    if (!lista.length) {
        bannersEl.innerHTML = '';
        return;
    }

    const slides = lista.map((banner, index) => {
        const imagen = escaparHTML(banner.imagen);
        const titulo = escaparHTML(banner.titulo);
        const enlace = String(banner.enlace || '').trim();

        const contenido = `
            <img src="${imagen}" alt="${titulo}" loading="${index === 0 ? 'eager' : 'lazy'}"
                onerror="this.closest('.banner').remove()">
            ${titulo ? `<div class="banner-info"><h2>${titulo}</h2></div>` : ''}
        `;

        if (enlace) {
            return `<a class="banner" href="${escaparHTML(enlace)}">${contenido}</a>`;
        }
        return `<div class="banner">${contenido}</div>`;
    }).join('');

    const indicadores = lista.length > 1 ? `
        <div class="banner-indicadores">
            ${lista.map((_, index) => `
                <button type="button" class="banner-indicador ${index === 0 ? 'activo' : ''}"
                    data-banner-index="${index}" aria-label="Ir al banner ${index + 1}"></button>
            `).join('')}
        </div>
    ` : '';

    bannersEl.innerHTML = `<div class="banners-track">${slides}</div>${indicadores}`;
    iniciarCarrusel(lista.length, bannersEl);
}

function mostrarBanner(indice, bannersEl) {
    const track = bannersEl.querySelector('.banners-track');
    const indicadores = bannersEl.querySelectorAll('.banner-indicador');
    if (!track) return;

    indiceBanner = indice;
    track.style.transform = `translateX(-${indice * 100}%)`;
    indicadores.forEach((indicador, index) => {
        indicador.classList.toggle('activo', index === indice);
    });
}

function iniciarCarrusel(cantidad, bannersEl) {
    if (intervaloCarrusel) {
        clearInterval(intervaloCarrusel);
        intervaloCarrusel = null;
    }

    indiceBanner = 0;
    mostrarBanner(0, bannersEl);

    if (cantidad <= 1) return;

    intervaloCarrusel = setInterval(() => {
        const siguiente = (indiceBanner + 1) % cantidad;
        mostrarBanner(siguiente, bannersEl);
    }, 5000);
}

function reiniciarCarrusel(cantidad, bannersEl) {
    if (intervaloCarrusel) {
        clearInterval(intervaloCarrusel);
        intervaloCarrusel = null;
    }

    if (cantidad <= 1) return;

    intervaloCarrusel = setInterval(() => {
        const siguiente = (indiceBanner + 1) % cantidad;
        mostrarBanner(siguiente, bannersEl);
    }, 5000);
}

export function configurarIndicadoresBanners(bannersEl) {
    bannersEl.addEventListener('click', event => {
        const indicador = event.target.closest('.banner-indicador');
        if (!indicador) return;

        const indice = Number(indicador.dataset.bannerIndex);
        if (Number.isNaN(indice)) return;

        mostrarBanner(indice, bannersEl);
        const cantidad = bannersEl.querySelectorAll('.banner').length;
        reiniciarCarrusel(cantidad, bannersEl);
    });
}
