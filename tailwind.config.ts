import type { Config } from "tailwindcss";

export default {
    darkMode: 'class',
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
            },
            maxWidth: {
                'content-narrow': '42rem',
                'content-wide': '64rem',
            },
            backgroundImage: {
                'accent-gradient': 'linear-gradient(to right, #fde047, #a855f7, #22d3ee)',
            },
        },
    },
    plugins: [],
} satisfies Config;
