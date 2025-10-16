/**
 * Temporary Debug Page - Check User & Organization Setup
 * DELETE THIS FILE AFTER DEBUGGING
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/Layout';

export function DebugUserPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUserSetup() {
      try {
        // 1. Check auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // 2. Check users table
        let userData = null;
        let userError = null;
        if (user) {
          const result = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          userData = result.data;
          userError = result.error;
        }

        // 3. Check organizations
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*');

        setDebugInfo({
          authUser: user,
          authError,
          usersTableData: userData,
          usersTableError: userError,
          organizations: orgs,
          organizationsError: orgsError,
        });
      } catch (error) {
        console.error('Debug error:', error);
        setDebugInfo({ error: String(error) });
      } finally {
        setLoading(false);
      }
    }

    checkUserSetup();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Loading debug info...</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">User & Organization Debug Info</h1>

        <div className="space-y-6">
          {/* Auth User */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">1. Auth User</h2>
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
              {JSON.stringify({
                id: debugInfo?.authUser?.id,
                email: debugInfo?.authUser?.email,
                created_at: debugInfo?.authUser?.created_at,
              }, null, 2)}
            </pre>
            {debugInfo?.authError && (
              <div className="mt-2 text-red-600 text-sm">
                Error: {debugInfo.authError.message}
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">2. Users Table Row</h2>
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(debugInfo?.usersTableData, null, 2)}
            </pre>
            {debugInfo?.usersTableError && (
              <div className="mt-2 text-red-600 text-sm">
                Error: {debugInfo.usersTableError.message}
              </div>
            )}
            {!debugInfo?.usersTableData && !debugInfo?.usersTableError && (
              <div className="mt-2 text-yellow-600 text-sm">
                ⚠️ No row found in users table for this auth user
              </div>
            )}
          </div>

          {/* Organizations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">3. Organizations</h2>
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(debugInfo?.organizations, null, 2)}
            </pre>
            {debugInfo?.organizationsError && (
              <div className="mt-2 text-red-600 text-sm">
                Error: {debugInfo.organizationsError.message}
              </div>
            )}
            {(!debugInfo?.organizations || debugInfo?.organizations?.length === 0) && (
              <div className="mt-2 text-yellow-600 text-sm">
                ⚠️ No organizations found
              </div>
            )}
          </div>

          {/* Diagnosis */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Diagnosis</h2>
            <div className="space-y-2 text-sm">
              {debugInfo?.authUser ? (
                <div className="text-green-700">✓ Auth user exists</div>
              ) : (
                <div className="text-red-700">✗ No auth user (not logged in)</div>
              )}

              {debugInfo?.usersTableData?.organization_id ? (
                <div className="text-green-700">✓ User has organization_id: {debugInfo.usersTableData.organization_id}</div>
              ) : (
                <div className="text-red-700">✗ User missing organization_id (this causes the RLS error)</div>
              )}

              {debugInfo?.organizations?.length > 0 ? (
                <div className="text-green-700">✓ Organizations exist ({debugInfo.organizations.length})</div>
              ) : (
                <div className="text-red-700">✗ No organizations in database</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
