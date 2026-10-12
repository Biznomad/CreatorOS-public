import { SignUp } from '@clerk/nextjs';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign Up' };

export default function SignUpPage() {
  return (
    <SignUp
      signInUrl='/auth/sign-in'
      appearance={{
        elements: {
          rootBox: 'mx-auto w-full',
          card: 'w-full border border-border/70 bg-card/95 shadow-2xl shadow-indigo-500/10 backdrop-blur',
          formButtonPrimary: 'min-h-11',
          formFieldInput: 'min-h-11',
          formFieldInputShowPasswordButton: 'min-h-11 min-w-11',
          footerActionLink: 'inline-flex min-h-11 items-center',
          socialButtonsBlockButton: 'min-h-11'
        }
      }}
    />
  );
}
