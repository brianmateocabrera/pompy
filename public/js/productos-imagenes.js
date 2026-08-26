import { llamarAPI } from './api.js';
import { optimizarImagen } from './imageOptimizer.js';


export async function subirImagen(
    dataUrl,
    nombreOriginal
) {

    const partes =
        dataUrl.split(',');


    if (partes.length < 2) {

        throw new Error(
            'Formato de imagen inválido.'
        );
    }


    const base64Puro =
        partes[1];


    const nombreLimpio =
        nombreOriginal
            .toLowerCase()
            .split('.')[0]
            .replace(
                /[^a-z0-9]/gi,
                '_'
            );


    const nombreArchivoWebP =
        `${Date.now()}-${nombreLimpio}.webp`;


    const rutaImagen =
        `public/imagenes/${nombreArchivoWebP}`;


    const json =
        await llamarAPI(
            'PUT',
            rutaImagen,
            {
                message:
                    `Subir imagen: ${nombreArchivoWebP}`,

                content:
                    base64Puro
            }
        );


    if (!json.success) {

        throw new Error(
            'Error al guardar la imagen en GitHub: ' +
            (
                json.error ||
                'Error desconocido.'
            )
        );
    }


    return rutaImagen.replace(
        'public/',
        '/'
    );
}


export async function procesarImagen(
    archivo
) {

    const imagenWebP =
        await optimizarImagen(
            archivo
        );


    return subirImagen(
        imagenWebP,
        archivo.name
    );
}
