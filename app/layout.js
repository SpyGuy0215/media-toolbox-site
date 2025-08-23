import {Inter} from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
});

export const metadata = {
    title: "Media Toolbox",
    description: "Convert your files, transcribe audio, and more - with Media Toolbox",
};

export default function RootLayout({children}) {
    return (
        <html lang="en" className={inter.className}>
        <body
        >
        {children}
        </body>
        </html>
    );
}
