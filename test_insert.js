const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await db.from('orders').insert({
    customer_name: 'Test', customer_phone: '123', customer_address: '123', payment_method: 'cod',
    shipping_fee: 35000, is_free_shipping: false
  }).select('id, shipping_fee, fb_url');
  console.log('Result:', data, error);
  if (data && data[0]) {
    await db.from('orders').delete().eq('id', data[0].id);
  }
}
test();
