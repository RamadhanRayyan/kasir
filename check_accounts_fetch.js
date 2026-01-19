
const supabaseUrl = 'https://jnzabtyshdhoabmadqmc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuemFidHlzaGRob2FibWFkcW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ1MzM0NSwiZXhwIjoyMDg0MDI5MzQ1fQ.UBxVHhbAoPCsybUinArwt-cvK4Yj0JTH-fBM1n3_djk';

async function checkAccounts() {
  const res = await fetch(`${supabaseUrl}/rest/v1/accounts?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log('Accounts:', JSON.stringify(data, null, 2));
}

checkAccounts();
