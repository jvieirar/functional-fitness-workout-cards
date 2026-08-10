import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repo = fileURLToPath(new URL('..', import.meta.url));
const slugs = ['morning-mobility', 'full-body-a', 'full-body-b', 'full-body-c', 'handstand-v-sit', 'front-lever', 'pistol-squat', 'grease-the-groove'];
const cellWidth = 400;
const cellHeight = 600;
const gap = 24;
const columns = 2;
const rows = 4;
const width = columns * cellWidth + (columns + 1) * gap;
const height = rows * cellHeight + (rows + 1) * gap;
const composites = [];
for (const [index, slug] of slugs.entries()) {
  const input = join(repo, 'docs', 'cards', `${slug}-v1.png`);
  const buffer = await sharp(input).resize(cellWidth, cellHeight, { fit: 'contain', background: '#f5f0e5' }).png().toBuffer();
  composites.push({ input: buffer, left: gap + (index % columns) * (cellWidth + gap), top: gap + Math.floor(index / columns) * (cellHeight + gap) });
}
await mkdir(join(repo, 'docs'), { recursive: true });
const output = join(repo, 'docs', 'workout-card-index-preview.png');
await sharp({ create: { width, height, channels: 4, background: '#d9d5ca' } }).composite(composites).png().toFile(output);
console.log(`Created ${output} (${width}x${height})`);
