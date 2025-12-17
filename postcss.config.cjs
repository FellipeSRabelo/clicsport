// Arquivo CommonJS para compatibilidade quando package.json contém "type": "module"
module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss': {},
    'postcss-nesting': {},
    'autoprefixer': {},
  },
}
