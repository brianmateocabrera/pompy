import { llamarAPI } from './api.js';
import { optimizarImagen } from './imageOptimizer.js';
import { mostrarCargando, renderizarTabla, cargarFormulario, cancelarEdicion } from './ui.js';

const PATH_JSON = 'data/productos.json';
let shaActualJson = '';
let listaProductos = [];

// --- 1. CARGAR INVENTARIO ---
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

// --- 2. SUBIR IMAGEN (CORREGIDA PARA EVITAR IMAGEN NEGRA) ---
async function subirImagen(dataUrl, nombreOriginal) {
    // Extraemos solo el contenido base64 puro (sin el encabezado data:image/...)
    const base64Puro = dataUrl.split(',')[1]; 

    // Limpiamos el nombre: minúsculas, sin espacios y con extensión webp
    const nombreLimpio = nombreOriginal.toLowerCase().split('.')[0].replace(/[^a-z0-9]/gi, '_');
    const nombreArchivoWebP = `${Date.now()}-${nombreLimpio}.webp`;
    const rutaImagen = `public/imagenes/${nombreArchivoWebP}`;

    const json = await llamarAPI('PUT', rutaImagen, { 
        message: `Subir imagen: ${nombreArchivoWebP}`,
        content: base64Puro 
    });

    if (!json.success) throw new Error('Error al guardar la imagen en GitHub: ' + json.error);

    // Retorna la ruta que usará Vercel
    return rutaImagen.replace('public/', '/');
}

// --- 3. GUARDAR CAMBIOS EN EL JSON ---
async function guardarCambiosJSON(mensajeCommit) {
    const json = await llamarAPI('PUT', PATH_JSON, {
        message: mensajeCommit,
        content: JSON.stringify(listaProductos, null, 2),
        sha: shaActualJson || undefined
    });
    
    if (json.success) {
    alert('¡Cambios guardados con éxito!');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await cargarInventario();
} else {
        alert('Error al actualizar el índice de catálogo: ' + json.error);
    }
}

// --- 4. EVENTO SUBMIT (ORQUESTADOR) ---
document.getElementById('prodForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarCargando(true, "Iniciando proceso...");

    const index = parseInt(document.getElementById('editIndex').value);
    const fileInput = document.getElementById('imagenFile');
    let urlImagenFinal = index !== -1 ? listaProductos[index].imagen : '';

    try {
        // Si hay un archivo seleccionado, optimizamos y subimos
        if (fileInput.files.length > 0) {
            const archivoFisico = fileInput.files[0];
            
            mostrarCargando(true, "Optimizando a WebP (Canvas)...");
            const imagenWebP = await optimizarImagen(archivoFisico);
            
            mostrarCargando(true, "Subiendo imagen a GitHub...");
            urlImagenFinal = await subirImagen(imagenWebP, archivoFisico.name);
        } else if (index === -1) {
            alert('Debes seleccionar una imagen para el nuevo producto.');
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
        alert("Error: " + error.message);
    } finally {
        mostrarCargando(false);
    }
});

// --- 5. FUNCIONES DE APOYO ---
function iniciarEdicion(index) {
    cargarFormulario(listaProductos[index], index);
}

async function iniciarEliminacion(index) {
    const prod = listaProductos[index];
    if (!confirm(`¿Deseas eliminar "${prod.nombre}"?`)) return;

    listaProductos.splice(index, 1);
    mostrarCargando(true, "Sincronizando eliminación...");
    await guardarCambiosJSON(`Eliminar producto: ${prod.nombre}`);
    mostrarCargando(false);
}

document.getElementById('btnCancelar').addEventListener('click', cancelarEdicion);

// Arrancar la App
cargarInventario();
