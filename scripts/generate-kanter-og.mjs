/**
 * Regenerates public/og/og-kanter-ball.png (1200x630).
 * Run: node scripts/generate-kanter-og.mjs
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const WIDTH = 1200;
const HEIGHT = 630;

const paths = {
	pacifico: join(root, 'public/fonts/pacifico-400.woff2'),
	playfair: join(root, 'public/fonts/playfair-var.woff2'),
	openSans: join(root, 'public/fonts/open-sans-var.woff2'),
	output: join(root, 'public/og/og-kanter-ball.png'),
};

function fontDataUrl(filePath) {
	const buf = readFileSync(filePath);
	return `data:application/font-woff2;base64,${buf.toString('base64')}`;
}

function buildSvg(fonts) {
	const { pacifico, playfair, openSans } = fonts;

	return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Pacifico';
        src: url('${pacifico}') format('woff2');
        font-weight: 400;
      }
      @font-face {
        font-family: 'Playfair';
        src: url('${playfair}') format('woff2');
        font-weight: 800;
      }
      @font-face {
        font-family: 'OpenSans';
        src: url('${openSans}') format('woff2');
        font-weight: 800;
      }
      .brand { font-family: Pacifico, cursive; }
      .display { font-family: Playfair, Georgia, serif; font-weight: 800; }
      .ui { font-family: OpenSans, system-ui, sans-serif; font-weight: 800; }
    </style>
    <linearGradient id="heroWash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2C0C54" stop-opacity="0.82"/>
      <stop offset="58%" stop-color="#121212" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="pitchWash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#174B2C"/>
      <stop offset="100%" stop-color="#0E2D1D"/>
    </linearGradient>
    <pattern id="stripes" width="28.28" height="28.28" patternUnits="userSpaceOnUse" patternTransform="rotate(-45 0 0)">
      <rect width="18" height="28.28" fill="#121212"/>
      <rect x="18" width="2" height="28.28" fill="#E6A817" fill-opacity="0.055"/>
      <rect x="20" width="8.28" height="28.28" fill="#121212"/>
    </pattern>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#000000" flood-opacity="0.42"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="#121212"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#stripes)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#heroWash)"/>

  <g transform="translate(74 78)">
    <text x="0" y="0" fill="#E6A817" font-family="Pacifico, cursive" font-size="48">SportyKore</text>
    <text class="display" x="0" y="168" fill="#F8F8FA" font-size="88" letter-spacing="-1">Kanter</text>
    <text class="display" x="0" y="248" fill="#F8F8FA" font-size="88" letter-spacing="-1">Ball</text>
    <text class="ui" x="4" y="304" fill="#F8F8FA" fill-opacity="0.72" font-size="25">Flick seven caps.</text>
    <text class="ui" x="4" y="338" fill="#F8F8FA" fill-opacity="0.72" font-size="25">Beat the computer.</text>

    <g transform="translate(0 386)">
      <rect x="0" y="0" width="354" height="58" rx="18" fill="#121212" fill-opacity="0.68" stroke="#F8F8FA" stroke-opacity="0.16"/>
      <text class="ui" x="60" y="37" fill="#F8F8FA" fill-opacity="0.78" font-size="18">7v7</text>
      <line x1="118" y1="0" x2="118" y2="58" stroke="#F8F8FA" stroke-opacity="0.14"/>
      <text class="ui" x="172" y="37" fill="#F8F8FA" fill-opacity="0.78" font-size="18">90s</text>
      <line x1="236" y1="0" x2="236" y2="58" stroke="#F8F8FA" stroke-opacity="0.14"/>
      <text class="ui" x="283" y="37" fill="#F8F8FA" fill-opacity="0.78" font-size="18">First 3</text>
    </g>
  </g>

  <g transform="translate(590 82)" filter="url(#shadow)">
    <rect x="0" y="0" width="536" height="424" rx="26" fill="#1A1A1F" stroke="#F8F8FA" stroke-opacity="0.14"/>
    <g transform="translate(28 28)">
      <rect x="0" y="0" width="480" height="84" rx="16" fill="#121212" fill-opacity="0.82" stroke="#F8F8FA" stroke-opacity="0.14"/>
      <circle cx="52" cy="42" r="23" fill="#9B1C28" stroke="#F8F8FA" stroke-opacity="0.18" stroke-width="4"/>
      <text class="ui" x="52" y="50" fill="#FFFFFF" font-size="21" text-anchor="middle">Y</text>
      <text class="ui" x="90" y="50" fill="#FFFFFF" font-size="24">You</text>

      <text class="ui" x="240" y="55" fill="#E6A817" font-size="30" text-anchor="middle">0 - 0</text>
      <!-- <rect x="214" y="57" width="52" height="26" rx="13" fill="#F8F8FA" fill-opacity="0.1"/> -->
      <text class="ui" x="240" y="75" fill="#FBE9B8" font-size="13" text-anchor="middle">90s</text>

      <text class="ui" x="378" y="50" fill="#FBE9B8" font-size="24" text-anchor="end">CPU</text>
      <circle cx="422" cy="42" r="23" fill="#4A148C" stroke="#F8F8FA" stroke-opacity="0.18" stroke-width="4"/>
      <text class="ui" x="422" y="50" fill="#FFFFFF" font-size="21" text-anchor="middle">C</text>
    </g>

    <g transform="translate(28 125)">
      <rect x="0" y="0" width="480" height="264" rx="18" fill="url(#pitchWash)" stroke="#37A765" stroke-opacity="0.65" stroke-width="2"/>
      <rect x="50" y="48" width="380" height="168" rx="16" fill="none" stroke="#F8F8FA" stroke-opacity="0.12" stroke-width="3"/>
      <line x1="240" y1="48" x2="240" y2="216" stroke="#F8F8FA" stroke-opacity="0.12" stroke-width="3"/>
      <line x1="50" y1="132" x2="430" y2="132" stroke="#F8F8FA" stroke-opacity="0.12" stroke-width="3"/>
      <rect x="192" y="20" width="96" height="30" fill="none" stroke="#F8F8FA" stroke-opacity="0.12" stroke-width="4"/>
      <rect x="192" y="214" width="96" height="30" fill="none" stroke="#F8F8FA" stroke-opacity="0.12" stroke-width="4"/>

      <g class="ui" font-size="20" text-anchor="middle">
        <circle cx="240" cy="70" r="25" fill="#2C0C54" stroke="#F8F8FA" stroke-opacity="0.16" stroke-width="5"/>
        <text x="240" y="78" fill="#F8F8FA" fill-opacity="0.62">K</text>
        <circle cx="138" cy="114" r="24" fill="#2C0C54" stroke="#F8F8FA" stroke-opacity="0.16" stroke-width="5"/>
        <text x="138" y="122" fill="#F8F8FA" fill-opacity="0.62">C</text>
        <circle cx="342" cy="114" r="24" fill="#2C0C54" stroke="#F8F8FA" stroke-opacity="0.16" stroke-width="5"/>
        <text x="342" y="122" fill="#F8F8FA" fill-opacity="0.62">C</text>
        <circle cx="240" cy="194" r="24" fill="#9B1C28" stroke="#F8F8FA" stroke-opacity="0.16" stroke-width="5"/>
        <text x="240" y="202" fill="#F8F8FA" fill-opacity="0.62">Y</text>
        <circle cx="298" cy="132" r="12" fill="#F8F8FA"/>
      </g>
    </g>
  </g>
</svg>`;
}

async function main() {
	mkdirSync(dirname(paths.output), { recursive: true });

	const fonts = {
		pacifico: fontDataUrl(paths.pacifico),
		playfair: fontDataUrl(paths.playfair),
		openSans: fontDataUrl(paths.openSans),
	};

	await sharp(Buffer.from(buildSvg(fonts))).png().toFile(paths.output);
	const metadata = await sharp(paths.output).metadata();
	console.log(`Wrote ${paths.output} (${metadata.width}x${metadata.height})`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
