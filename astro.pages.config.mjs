import { defineConfig } from 'astro/config';
import localConfig from './astro.config.mjs';

export default defineConfig({
    ...localConfig,
    site: 'https://vijiyarathan-rithush.github.io',
    base: '/beko-barber-shop-pages',
    outDir: './dist-pages'
});
