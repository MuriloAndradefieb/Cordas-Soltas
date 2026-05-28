const fs = require('fs');
const path = require('path');
const pool = require('../../config/pool_conexoes');

const DEFAULT_SHOW_IMAGE = '/img/pexels-wendywei-1190297.jpg';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const MIME_POR_EXTENSAO = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
};

let colunaImagemGarantida = false;

async function garantirColunaImagem() {
    if (colunaImagemGarantida) return;

    await pool.query('ALTER TABLE shows MODIFY COLUMN imagem_url MEDIUMTEXT');
    colunaImagemGarantida = true;
}

function uploadParaDataUrl(file) {
    if (!file || !file.buffer || !file.mimetype) {
        return null;
    }

    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

function resolverCaminhoImagemPublica(imagemUrl) {
    if (!imagemUrl || !imagemUrl.startsWith('/img/')) {
        return null;
    }

    const nomeArquivo = path.basename(imagemUrl);
    return path.join(__dirname, '..', 'public', 'img', nomeArquivo);
}

function pareceUploadAntigo(imagemUrl) {
    if (!imagemUrl || !imagemUrl.startsWith('/img/')) {
        return false;
    }

    return /^\d+\.(avif|gif|jpe?g|png|webp)$/i.test(path.basename(imagemUrl));
}

function arquivoLocalParaDataUrl(caminhoArquivo) {
    const extensao = path.extname(caminhoArquivo).toLowerCase();
    const mime = MIME_POR_EXTENSAO[extensao];

    if (!mime) return null;

    const buffer = fs.readFileSync(caminhoArquivo);
    return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function migrarUploadsAntigos() {
    await garantirColunaImagem();

    const [shows] = await pool.query(
        `SELECT id, imagem_url
           FROM shows
          WHERE imagem_url LIKE '/img/%'`
    );

    let migrados = 0;
    let ignorados = 0;

    for (const show of shows) {
        if (!pareceUploadAntigo(show.imagem_url)) {
            ignorados += 1;
            continue;
        }

        const caminhoImagem = resolverCaminhoImagemPublica(show.imagem_url);
        if (!caminhoImagem || !fs.existsSync(caminhoImagem)) {
            ignorados += 1;
            continue;
        }

        const dataUrl = arquivoLocalParaDataUrl(caminhoImagem);
        if (!dataUrl) {
            ignorados += 1;
            continue;
        }

        await pool.query(
            'UPDATE shows SET imagem_url = ? WHERE id = ?',
            [dataUrl, show.id]
        );
        migrados += 1;
    }

    return { migrados, ignorados };
}

module.exports = {
    DEFAULT_SHOW_IMAGE,
    MAX_UPLOAD_BYTES,
    garantirColunaImagem,
    migrarUploadsAntigos,
    uploadParaDataUrl
};
