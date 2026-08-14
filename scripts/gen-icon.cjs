// Gera build/icon.ico (256x256, 32bpp BGRA) com a cor primária do app.
// Sem dependências externas — escreve o formato ICO manualmente.
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const PRIMARY = [0x4f, 0x6a, 0x2d]; // #2d6a4f em BGR (R=2d,G=6a,B=4f) -> [B,G,R]
const LIGHT = [0x85, 0xb9, 0x3f];   // verde claro (#3fb985) BGR

function px(x, y) {
  // x,y em 0..SIZE-1 (origem topo-esquerda); desenha um "M" branco simples.
  // Borda interna clara + letra M estilizada em branco.
  const m = 48;                       // margem
  const top = m, bot = SIZE - m, left = m, right = SIZE - m;
  // fundo: primário
  let c = PRIMARY;
  // moldura clara (anel)
  const ring = 14;
  if (x < m + ring || x > SIZE - m - ring || y < m + ring || y > SIZE - m - ring) {
    c = LIGHT;
  }
  // Letra M (branco) — três hastes verticais + dois traversões diagonais
  const white = [255, 255, 255];
  const hW = 16;                      // meia-largura das hastes
  const x1 = left + 18, x2 = (left + right) / 2, x3 = right - 18;
  const inHaste = (cx) => Math.abs(x - cx) <= hW && y >= top + 20 && y <= bot - 10;
  const inDiag1 = () => {
    // da haste esquerda até centro
    const t = (y - (top + 20)) / ((bot - 10) - (top + 20));
    const ex = x1 + (x2 - x1) * t;
    return Math.abs(x - ex) <= hW && y >= top + 20 && y <= (top + bot) / 2;
  };
  const inDiag2 = () => {
    const t = (y - (top + 20)) / ((bot - 10) - (top + 20));
    const ex = x2 + (x3 - x2) * t;
    return Math.abs(x - ex) <= hW && y >= top + 20 && y <= (top + bot) / 2;
  };
  if (inHaste(x1) || inHaste(x2) || inHaste(x3) || inDiag1() || inDiag2()) c = white;
  return [c[0], c[1], c[2], 255]; // BGRA
}

// Monta os pixels (bottom-up)
const pixels = Buffer.alloc(SIZE * SIZE * 4);
let o = 0;
for (let y = SIZE - 1; y >= 0; y--) {
  for (let x = 0; x < SIZE; x++) {
    const [b, g, r, a] = px(x, y);
    pixels[o++] = b; pixels[o++] = g; pixels[o++] = r; pixels[o++] = a;
  }
}

// Máscara AND (1bpp, toda zero = totalmente opaco via alpha)
const andRowBytes = Math.ceil(SIZE / 32) * 4; // 8 bytes por linha p/ 256px
const andMask = Buffer.alloc(andRowBytes * SIZE, 0);

// BITMAPINFOHEADER (40) + pixels + andMask
const bmpHeader = Buffer.alloc(40);
bmpHeader.writeUInt32LE(40, 0);
bmpHeader.writeInt32LE(SIZE, 4);
bmpHeader.writeInt32LE(SIZE * 2, 8); // altura dobrada (XOR + AND)
bmpHeader.writeUInt16LE(1, 12);
bmpHeader.writeUInt16LE(32, 14);
bmpHeader.writeUInt32LE(0, 16);       // BI_RGB
bmpHeader.writeUInt32LE(pixels.length, 20);
const imageData = Buffer.concat([bmpHeader, pixels, andMask]);

// ICONDIR + ICONDIRENTRY
const iconDir = Buffer.alloc(6);
iconDir.writeUInt16LE(0, 0);   // reservado
iconDir.writeUInt16LE(1, 2);   // tipo 1 = ícone
iconDir.writeUInt16LE(1, 4);   // 1 imagem
const entry = Buffer.alloc(16);
entry.writeUInt8(SIZE === 256 ? 0 : SIZE, 0); // 0 significa 256
entry.writeUInt8(SIZE === 256 ? 0 : SIZE, 1);
entry.writeUInt8(0, 2);        // color count (0 p/ >256)
entry.writeUInt8(0, 3);        // reservado
entry.writeUInt16LE(1, 4);     // planes
entry.writeUInt16LE(32, 6);    // bit count
entry.writeUInt32LE(imageData.length, 8);
entry.writeUInt32LE(6 + 16, 12); // offset p/ imageData

const out = Buffer.concat([iconDir, entry, imageData]);
const dir = path.join(__dirname, '..', 'build');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.ico'), out);
console.log('Ícone gerado: build/icon.ico (' + out.length + ' bytes)');
