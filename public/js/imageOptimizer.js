const LIMITE_MEGABYTES = 4.5;

export function optimizarImagen(file) {
    return new Promise((resolve, reject) => {
        if (file.size > LIMITE_MEGABYTES * 1024 * 1024) {
            return reject(new Error(`El archivo original supera el límite permitido de ${LIMITE_MEGABYTES}MB.`));
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/webp', 0.7);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Error al procesar la estructura de la imagen.'));
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo físico.'));
    });
}
