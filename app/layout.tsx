import type { Metadata } from 'next';
import { Inter, Poppins, Montserrat } from 'next/font/google';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// Choose one font - uncomment your preferred option:

// Option 1: Poppins (Modern & Clean - Best for food apps)
const font = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap'
});

// Option 2: Inter (Professional & Readable)
// const font = Inter({ 
//   subsets: ['latin'],
//   display: 'swap'
// });

// Option 3: Montserrat (Elegant & Bold)
// const font = Montserrat({ 
//   subsets: ['latin'],
//   weight: ['300', '400', '500', '600', '700'],
//   display: 'swap'
// });

export const metadata: Metadata = {
  title: 'Food Admin Dashboard',
  description: 'Admin panel for food management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={font.className}>
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}