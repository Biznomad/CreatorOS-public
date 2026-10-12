import { ClerkProvider } from '@clerk/nextjs';
import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/components/themes/font.config';
import { DEFAULT_THEME, THEMES } from '@/components/themes/theme.config';
import ThemeProvider from '@/components/themes/theme-provider';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import '../styles/globals.css';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b'
};
const SHOPIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID || 'a29a9f876eee6b80a370854f4c19109a';

export const metadata: Metadata = {
  title: {
    default: 'CreatorOS — The Operating System for Creator Programs',
    template: '%s | CreatorOS'
  },
  description: 'AI-powered influencer discovery, outreach automation, and whitelisted ad management. Turn creators into scalable revenue for DTC brands and agencies.',
  keywords: ['influencer marketing', 'creator management', 'whitelisted ads', 'UGC automation', 'meta partnership ads', 'tiktok spark ads', 'creator CRM'],
  openGraph: {
    title: 'CreatorOS — The Operating System for Creator Programs',
    description: 'AI-powered influencer discovery, outreach automation, and whitelisted ad management.',
    url: 'https://example.com',
    siteName: 'CreatorOS',
    type: 'website',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CreatorOS — The Operating System for Creator Programs',
    description: 'AI-powered influencer discovery, outreach automation, and whitelisted ad management.'
  },
  robots: {
    index: true,
    follow: true
  },
  metadataBase: new URL('https://example.com')
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isValidTheme = THEMES.some((t) => t.value === activeThemeValue);
  const themeToApply = isValidTheme ? activeThemeValue! : DEFAULT_THEME;

  return (
    <ClerkProvider
      afterSignOutUrl='/'
      appearance={{
        baseTheme: undefined,
        variables: { colorPrimary: '#6366f1' }
      }}
    >
      <html lang='en' suppressHydrationWarning data-theme={themeToApply}>
        <head>
          <meta name='shopify-api-key' content={SHOPIFY_CLIENT_ID} />
          <script
            dangerouslySetInnerHTML={{
              __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `
            }}
          />
        </head>
        <body
          className={cn(
            'bg-background overflow-x-hidden overscroll-none font-sans antialiased',
            fontVariables
          )}
        >
          <NextTopLoader color='var(--primary)' showSpinner={false} />
          <NuqsAdapter>
            <ThemeProvider
              attribute='class'
              defaultTheme='system'
              enableSystem
              disableTransitionOnChange
              enableColorScheme
            >
              <Providers activeThemeValue={themeToApply}>
                <Toaster />
                {children}
              </Providers>
            </ThemeProvider>
          </NuqsAdapter>
        </body>
      </html>
    </ClerkProvider>
  );
}
