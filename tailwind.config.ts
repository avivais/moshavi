import type { Config } from "tailwindcss";

export default {
    darkMode: 'class',
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
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
                'content-narrow': '42rem',   /* 672px, same as max-w-2xl */
                'content-wide': '64rem',     /* 1024px, same as max-w-4xl */
            },
            backgroundImage: {
                'accent-gradient': 'linear-gradient(to right, #fde047, #a855f7, #22d3ee)', /* yellow-300, purple-500, cyan-600 */
            },
        },
    },
    plugins: [],
} satisfies Config;
    plugins: [],
} satisfies Config;
