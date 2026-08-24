function escaparHTML(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


function formatearPrecio(valor) {
    return new Intl.NumberFormat(
        'es-AR',
        {
            style: 'currency',
            currency: 'ARS'
        }
    ).format(Number(valor) || 0);
}


/* ------------------------------------------
   CARGANDO
------------------------------------------ */

export function mostrarCargando(
    visible,
    mensaje = 'Procesando...'
) {
    const el =
        document.getElementById('loadingText');

    if (!el) return;

    el.textContent = mensaje;

    el.style.display =
        visible ? 'block' : 'none';
}


/* ------------------------------------------
   TABLA
------------------------------------------ */

export function renderizarTabla(
    listaProductos,
    onEditar,
    onEliminar
) {
    const tbody =
        document.getElementById(
            'tablaProductos'
        );

    if (!tbody) return;

    if (
        !listaProductos ||
        listaProductos.length === 0
    ) {
        tbody.innerHTML =
            '<tr><td colspan="8">No hay productos registrados.</td></tr>';

        return;
    }

    tbody.innerHTML =
        listaProductos.map(
            (prod, index) => {

                const nombre =
                    escaparHTML(
                        prod.nombre
                    );

                const sku =
                    escaparHTML(
                        prod.sku || '-'
                    );

                const imagen =
                    escaparHTML(
                        prod.imagenPrincipal ||
                        prod.imagenes?.[0]?.url ||
                        prod.imagen ||
                        '/imagenes/no-image.webp'
                    );

                const costo =
                    formatearPrecio(
                        prod.precioCosto
                    );

                const precio =
                    formatearPrecio(
                        prod.precio
                    );

                const stock =
                    Number(prod.stock) || 0;

                let estado =
                    prod.activo
                        ? '<span class="estado-activo">Activo</span>'
                        : '<span class="estado-inactivo">Inactivo</span>';

                if (prod.destacado) {
                    estado +=
                        '<br><span class="estado-destacado">Destacado</span>';
                }

                return `
                    <tr>

                        <td>
                            <img
                                src="${imagen}"
                                class="img-preview"
                                alt="${nombre}"
                                onerror="this.src='/imagenes/no-image.webp'"
                            >
                        </td>

                        <td>
                            <strong>${nombre}</strong>
                        </td>

                        <td>${sku}</td>

                        <td>${costo}</td>

                        <td>${precio}</td>

                        <td>${stock}</td>

                        <td>${estado}</td>

                        <td>

                            <button
                                type="button"
                                class="btn-edit"
                                data-index="${index}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="btn-delete"
                                data-index="${index}"
                            >
                                Eliminar
                            </button>

                        </td>

                    </tr>
                `;
            }
        ).join('');


    tbody
        .querySelectorAll('.btn-edit')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () =>
                    onEditar(
                        parseInt(
                            btn.dataset.index,
                            10
                        )
                    )
            );
        });


    tbody
        .querySelectorAll('.btn-delete')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () =>
                    onEliminar(
                        parseInt(
                            btn.dataset.index,
                            10
                        )
                    )
            );
        });
}

/* ------------------------------------------
   LISTAS DEL FORMULARIO
------------------------------------------ */

const listasFormulario = {
    categoria: [],
    tags: [],
    badges: []
};


function normalizarLista(
    valores
) {

    if (!Array.isArray(valores)) {
        return [];
    }

    return [
        ...new Set(
            valores
                .map(valor =>
                    String(valor || '').trim()
                )
                .filter(Boolean)
        )
    ];
}


function renderizarChips(
    tipo
) {

    const contenedor =
        document.getElementById(
            `${tipo}Lista`
        );

    if (!contenedor) {
        return;
    }

    const valores =
        listasFormulario[tipo];

    contenedor.innerHTML =
        valores.map(
            (valor, index) => `

                <span class="chip">

                    ${escaparHTML(valor)}

                    <button
                        type="button"
                        data-lista="${tipo}"
                        data-index="${index}"
                        aria-label="Eliminar ${escaparHTML(valor)}"
                    >
                        ×
                    </button>

                </span>

            `
        ).join('');
}


function agregarValorLista(
    tipo,
    valor
) {

    const limpio =
        String(valor || '').trim();

    if (!limpio) {
        return;
    }

    const existe =
        listasFormulario[tipo]
            .some(
                item =>
                    item.toLowerCase() ===
                    limpio.toLowerCase()
            );

    if (existe) {
        return;
    }

    listasFormulario[tipo].push(
        limpio
    );

    renderizarChips(tipo);
}


function eliminarValorLista(
    tipo,
    index
) {

    listasFormulario[tipo].splice(
        index,
        1
    );

    renderizarChips(tipo);
}


export function obtenerListaFormulario(
    tipo
) {

    return [
        ...listasFormulario[tipo]
    ];
}


function cargarListaFormulario(
    tipo,
    valores
) {

    listasFormulario[tipo] =
        normalizarLista(valores);

    renderizarChips(tipo);
}


function limpiarListasFormulario() {

    Object.keys(
        listasFormulario
    ).forEach(
        tipo => {

            listasFormulario[tipo] = [];

            renderizarChips(tipo);
        }
    );
}


/* ------------------------------------------
   EVENTOS DE LISTAS
------------------------------------------ */

document
    .querySelectorAll('.btn-agregar-lista')
    .forEach(
        boton => {

            boton.addEventListener(
                'click',
                () => {

                    const tipo =
                        boton.dataset.lista;

                    const input =
                        document.getElementById(
                            tipo
                        );

                    if (!input) {
                        return;
                    }

                    agregarValorLista(
                        tipo,
                        input.value
                    );

                    input.value = '';

                    input.focus();
                }
            );
        }
    );


Object.keys(
    listasFormulario
).forEach(
    tipo => {

        const input =
            document.getElementById(
                tipo
            );

        if (!input) {
            return;
        }

        input.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Enter'
                ) {

                    event.preventDefault();

                    document
                        .querySelector(
                            `.btn-agregar-lista[data-lista="${tipo}"]`
                        )
                        ?.click();
                }
            }
        );
    }
);


document.addEventListener(
    'click',
    event => {

        const boton =
            event.target.closest(
                '.chip button'
            );

        if (!boton) {
            return;
        }

        eliminarValorLista(
            boton.dataset.lista,
            Number(
                boton.dataset.index
            )
        );
    }
);

/* ------------------------------------------
   FORMULARIO
------------------------------------------ */

export function cargarFormulario(
    prod,
    index
) {
    document.getElementById(
        'editIndex'
    ).value = index;


    document.getElementById(
        'sku'
    ).value = prod.sku || '';


    document.getElementById(
        'nombre'
    ).value = prod.nombre || '';


    document.getElementById(
        'precioCosto'
    ).value =
        prod.precioCosto ?? 0;


    document.getElementById(
        'precio'
    ).value =
        prod.precio ?? 0;


    document.getElementById(
        'precioAnterior'
    ).value =
        prod.precioAnterior ?? '';


    document.getElementById(
        'descripcion'
    ).value =
        prod.descripcion || '';


    cargarListaFormulario(
    'categoria',
    prod.categoria
);


cargarListaFormulario(
    'tags',
    prod.tags
);


cargarListaFormulario(
    'badges',
    prod.badges
);

    document.getElementById(
        'stock'
    ).value =
        prod.stock ?? 0;


    document.getElementById(
        'talles'
    ).value =
        Array.isArray(prod.talles)
            ? prod.talles.join(', ')
            : '';


    document.getElementById(
        'colores'
    ).value =
        Array.isArray(prod.colores)
            ? prod.colores.join(', ')
            : '';


    document.getElementById(
        'activo'
    ).checked =
        prod.activo !== false;


    document.getElementById(
        'destacado'
    ).checked =
        prod.destacado === true;


    document.getElementById(
        'orden'
    ).value =
        prod.orden ?? 0;


    document.getElementById(
        'imagenFile'
    ).required = false;


    renderizarImagenesFormulario(prod);


    document.getElementById(
        'formTitle'
    ).textContent =
        'Editar Producto';


    document.getElementById(
        'btnGuardar'
    ).textContent =
        'Guardar Cambios';


    document.getElementById(
        'btnCancelar'
    ).style.display =
        'inline-block';
}


/* ------------------------------------------
   IMÁGENES
------------------------------------------ */

export function renderizarImagenesFormulario(
    producto
) {
    const contenedor =
        document.getElementById(
            'imagenesPreview'
        );

    if (!contenedor) return;


    const imagenes =
        Array.isArray(producto.imagenes)
            ? [...producto.imagenes]
            : producto.imagen
                ? [{
                    url: producto.imagen,
                    alt: producto.nombre,
                    orden: 0
                }]
                : [];


    const principal =
        producto.imagenPrincipal ||
        imagenes[0]?.url ||
        '';


    if (imagenes.length === 0) {
        contenedor.innerHTML =
            '<p>No hay imágenes cargadas.</p>';

        return;
    }


    imagenes.sort(
        (a, b) =>
            (a.orden || 0) -
            (b.orden || 0)
    );


    contenedor.innerHTML =
        imagenes.map(
            (imagen, index) => {

                const url =
                    escaparHTML(
                        imagen.url
                    );

                const alt =
                    escaparHTML(
                        imagen.alt ||
                        producto.nombre
                    );

                const esPrincipal =
                    imagen.url === principal;


                return `
                    <div
                        class="imagen-preview-item"
                        data-imagen-index="${index}"
                    >

                        <img
                            src="${url}"
                            class="${
                                esPrincipal
                                    ? 'imagen-principal'
                                    : ''
                            }"
                            alt="${alt}"
                            onerror="this.src='/imagenes/no-image.webp'"
                        >

                        <p class="imagen-label">
                            ${
                                esPrincipal
                                    ? 'Imagen principal'
                                    : `Imagen ${index + 1}`
                            }
                        </p>

                        <button
                            type="button"
                            class="btn-imagen-principal"
                            data-imagen-index="${index}"
                        >
                            ${
                                esPrincipal
                                    ? 'Principal'
                                    : 'Hacer principal'
                            }
                        </button>

                        <button
                            type="button"
                            class="btn-subir-imagen"
                            data-imagen-index="${index}"
                            ${index === 0 ? 'disabled' : ''}
                        >
                            Subir
                        </button>

                        <button
                            type="button"
                            class="btn-bajar-imagen"
                            data-imagen-index="${index}"
                            ${
                                index === imagenes.length - 1
                                    ? 'disabled'
                                    : ''
                            }
                        >
                            Bajar
                        </button>

                        <button
                            type="button"
                            class="btn-eliminar-imagen"
                            data-imagen-index="${index}"
                        >
                            Eliminar
                        </button>

                    </div>
                `;
            }
        ).join('');
}


/* ------------------------------------------
   CANCELAR
------------------------------------------ */

export function cancelarEdicion() {

    const formulario =
        document.getElementById(
            'prodForm'
        );

    if (formulario) {
        formulario.reset();
    }


    document.getElementById(
        'editIndex'
    ).value = '-1';


    document.getElementById(
        'formTitle'
    ).textContent =
        'Agregar Nuevo Producto';


    document.getElementById(
        'btnGuardar'
    ).textContent =
        'Guardar Producto';


    document.getElementById(
        'btnCancelar'
    ).style.display =
        'none';


    const preview =
        document.getElementById(
            'imagenesPreview'
        );

    if (preview) {
        preview.innerHTML = '';
    }


    document.getElementById(
        'imagenFile'
    ).required = true;

    limpiarListasFormulario();
}
