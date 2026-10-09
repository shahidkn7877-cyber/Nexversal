import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { userRepository } from '@/repositories/user.repository';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, UserCheck, Database, Calendar, Mail } from 'lucide-react';

export default async function AdminUsersPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) {
    redirect('/admin/login');
  }

  const users = await userRepository.findAll(100);
  const totalUsers = await userRepository.count();

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="User & Identity Governance"
        description="Multi-tenant user administration, authentication status, and session auditing."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-border bg-card">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Users
          </span>
          <p className="text-2xl font-black text-foreground mt-1">{totalUsers}</p>
          <span className="text-[11px] text-muted-foreground">Real Database Records</span>
        </Card>
        <Card className="p-4 border-border bg-card">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Authentication Layer
          </span>
          <p className="text-2xl font-black text-emerald-500 mt-1">Persistent Sessions</p>
          <span className="text-[11px] text-muted-foreground">HttpOnly cookie + DB tokens</span>
        </Card>
        <Card className="p-4 border-border bg-card">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Database Engine
          </span>
          <p className="text-2xl font-black text-blue-500 mt-1">Prisma ORM</p>
          <span className="text-[11px] text-muted-foreground">SQLite / PostgreSQL active</span>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Registered User Accounts
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Live user identities securely persisted in the database
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              {totalUsers} {totalUsers === 1 ? 'Account' : 'Accounts'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="p-3 bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No Registered Users Yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Database persistence is operational. When users register via <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">/register</code>, their accounts will be cataloged here with role and session status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">User / Email</th>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Registered</th>
                    <th className="px-5 py-3 font-semibold">Identifier</th>
                    <th className="px-5 py-3 font-semibold">Security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-foreground font-medium">
                        {u.name || <span className="text-muted-foreground italic">Not provided</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={u.role === 'ADMIN' ? 'default' : 'secondary'}
                          className="text-[10px] font-bold uppercase tracking-wider"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                        {u.id}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Scrypt Hash</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}