/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Aqui podemos estender cores, fontes, etc., do ClicHub
      colors: {
        'clic-primary': '#FFC72C', // Cor principal (amarelo/dourado)
        'clic-secondary': '#3A4B54', // Cor escura (cinza/chumbo)
        'clic-accent': '#6EE7B7', // Cor de destaque (verde suave)
      },
      fontFamily: {
        // Usaremos Inter como fonte base
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


