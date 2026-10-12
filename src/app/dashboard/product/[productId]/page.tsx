import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard: Products'
};

export default function Page() {
  redirect('/dashboard/product');
}
