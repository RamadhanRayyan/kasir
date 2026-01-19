
const supabaseUrl = 'https://jnzabtyshdhoabmadqmc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuemFidHlzaGRob2FibWFkcW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ1MzM0NSwiZXhwIjoyMDg0MDI5MzQ1fQ.UBxVHhbAoPCsybUinArwt-cvK4Yj0JTH-fBM1n3_djk';

async function checkUsers() {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  // Filter for the specific users to keep output clean but informative
  const users = data.users?.map(u => ({
    email: u.email,
    metadata: u.user_metadata
  }));
  console.log('Users Meta:', JSON.stringify(users, null, 2));
}

checkUsers();
