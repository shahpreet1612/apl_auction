/** @type {import('tailwindcss').Config} */
    export default {
      content: [
        // This tells Tailwind which files to scan for classes
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {
          // Custom color extensions for the neon effect
          colors: {
            'neon-blue': '#4F46E5', // Indigo-600
            'neon-red': '#EF4444', // Red-500
          },
          // Custom shadow effects for the premium look
          boxShadow: {
            'neon-sm': '0 0 5px rgba(79, 70, 229, 0.5)',
            'neon-lg': '0 0 15px rgba(79, 70, 229, 0.7), 0 0 30px rgba(239, 68, 68, 0.3)',
            'neon-xl': '0 0 25px rgba(79, 70, 229, 0.8), 0 0 40px rgba(239, 68, 68, 0.5)',
          },
        },
      },
      plugins: [],
    }