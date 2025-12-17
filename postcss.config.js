// Arquivo na raiz do projeto (ClicHub)
// Usamos CommonJS para garantir compatibilidade com o carregador do PostCSS
export default {
  plugins: {
    'postcss-import': {},
    'tailwindcss': {},
    'postcss-nesting': {},
    'autoprefixer': {},
  },
}