import { llamarAPI } from './api.js';
import { optimizarImagen } from './imageOptimizer.js';
import { mostrarCargando, renderizarTabla, cargarFormulario, cancelarEdicion } from './ui.js';

const PATH_JSON = 'data/productos.json';
let shaActualJson = '';
let listaProductos = [];

// Cargar inventario inicial
async function cargarInventario() {
    mostrarCargando(true, "Cargando inventario desde GitHub...");
    try {
        const json = await llamarAPI('GET', PATH_JSON);
        if (json.success) {
            shaActualJson = json.sha;
            listaProductos = json.data || [];
        } else {
            shaActualJson = '';
            listaProductos = [];
        }
        renderizarTabla(listaProductos, iniciarEdicion, iniciarEliminacion);
    } catch (error) {
        alert('Error al conectar con la base de datos: ' + error.message);
    } finally {
        mostrarCargando(false);
    }
}

// Subir Imagen de manera independiente
async function subirImagen(file) {
    const base64Limpio = file.split(',');
    const nombreLimpio = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
    const rutaImagen = `public/imagenes/${nombreLimpio}`;

    const json = await llamarAPI('PUT', rutaImagen, { content: base64Limpio });
    if (!json.success) throw new Error('Error al guardar la imagen en el servidor: ' + json.error);

    return rutaImagen.replace('public/', '/');
}

// Guardar cambios totales del JSON
async function guardarCambiosJSON(mensajeCommit) {
    const json = await llamarAPI('PUT', PATH_JSON, {
        message: mensajeCommit,
        content: JSON.stringify(listaProductos, null, 2),
        sha: shaActualJson || undefined
    });
    
    if (json.success) {
        alert('¡Cambios guardados con éxito!');
        await cargarInventario();
    } else {
        alert('Error al actualizar el índice de catálogo: ' + json.error);
    }
}

// Manejar Submit del formulario
document.getElementById('prodForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarCargando(true, "Procesando información...");

    const index = parseInt(document.getElementById('editIndex').value);
    const fileInput = document.getElementById('imagenFile');
    let urlImagenFinal = index !== -1 ? listaProductos[index].imagen : '';

    try {
        if (fileInput.files.length > 0) {
            mostrarCargando(true, "Optimizando archivo a WebP...");
            const imagenWebP = await optimizarImagen(fileInput.files[0]);
            
            mostrarCargando(true, "Subiendo nueva imagen a GitHub...");
            urlImagenFinal = await subirImagen(imagenWebP);
        } else if (index === -1) {
            alert('Debes seleccionar una imagen para crear un producto.');
            mostrarCargando(false);
            return;
        }

        const productoData = {
            nombre: document.getElementById('nombre').value,
            precio: parseFloat(document.getElementById('precio').value),
            imagen: urlImagenFinal,
            descripcion: document.getElementById('descripcion').value
        };

        if (index === -1) {
            listaProductos.push(productoData);
            await guardarCambiosJSON(`Crear producto: ${productoData.nombre}`);
        } else {
            listaProductos[index] = productoData;
            await guardarCambiosJSON(`Actualizar producto: ${productoData.nombre}`);
        }
        cancelarEdicion();
    } catch (error) {
        alert(error.message);
    } finally {
        mostrarCargando(false);
    }
});

function iniciarEdicion(index) {
    cargarFormulario(listaProductos[index], index);
}

async function iniciarEliminacion(index) {
    const prod = listaProductos[index];
    if (!confirm(`¿Deseas eliminar permanentemente "${prod.nombre}"?`)) return;

    listaProductos.splice(index, 1);
    mostrarCargando(true, "Eliminando del registro...");
    await guardarCambiosJSON(`Eliminar producto: ${prod.nombre}`);
    mostrarCargando(false);
}

document.getElementById('btnCancelar').addEventListener('click', cancelarEdicion);

// Iniciar aplicación
cargarInventario();
