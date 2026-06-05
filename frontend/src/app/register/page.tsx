'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { AuthResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
      });
      login(data.access_token, data.user);
      toast.success(`¡Bienvenido, ${data.user.name}!`);
      router.push('/predictions');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al registrarse.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Únete a la quiniela del Mundial 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={loading} className="mt-1">
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-medium underline underline-offset-4">
                Ingresar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
