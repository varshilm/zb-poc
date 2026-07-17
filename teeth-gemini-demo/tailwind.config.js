/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        md: '577px',
        lg: '1025px',
      },
      colors: {
        'primary-blue': '#00294F',
        'primary-blue-2': '#004280',
        'primary-blue-3': '#003366',
        'secondary-teal': '#EFFBF9',
        'secondary-teal-dark': '#3EC7B7',
        'pagination-circle': '#D7D7D7',
        'sidebar-divider': '#B7B7B7',
        'secondary-teal-2': '#B8EDE4',
        'primary-blue-1':'#E6F3FF',
        'gray-50':'#F8F8F8',
        'icon-color-1': '#00B0D4',
        'primary-blue-4': '#E6F7F8',
        'calender-button':'#004280',
      },
      fontSize: {
        // Display scale
        'display-xl': ['8rem', { lineHeight: '1' }], // 128px
        'display-lg': ['6rem', { lineHeight: '1' }], // 96px
        'display-md': ['4.5rem', { lineHeight: '1' }], // 72px
        'display-sm': ['3.75rem', { lineHeight: '1' }], // 60px
        'display-xs': ['3rem', { lineHeight: '1' }], // 48px

        // Heading scale
        'heading-lg': ['2.25rem', { lineHeight: '2.5rem' }], // 36px–40px
        'heading-md': ['1.875rem', { lineHeight: '2.25rem' }], // 30px–36px
        'heading-sm': ['1.5rem', { lineHeight: '2rem' }], // 24px–32px
        'heading-xs': ['1.25rem', { lineHeight: '1.75rem' }], // 20px–28px

        // Label scale
        'label-lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px–28px
        'label-base': ['1rem', { lineHeight: '1.5rem' }], // 16px–24px
        'label-sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px–20px
        'label-xs': ['0.75rem', { lineHeight: '1rem' }], // 12px–16px

        // Body / paragraph scale
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],// 18px–28px
        'body-base': ['1rem', { lineHeight: '1.5rem' }],// 16px–24px
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],// 14px–20px
        'body-xs': ['0.75rem', { lineHeight: '1rem' }],// 12px–16px
      },
    },
  },
  plugins: [],
};

