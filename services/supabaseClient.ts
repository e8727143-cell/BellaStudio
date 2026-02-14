import { createClient } from '@supabase/supabase-js';

// Intentar usar variables de entorno primero (Mejor práctica para Vercel)
// Si no existen, usar las credenciales de fallback (solo para demo/desarrollo)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://njxodvldycdindlrpund.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0biaRqcvGAbhCv9Mkw9p5Q_rqgZzIHf';

export const supabase = createClient(supabaseUrl, supabaseKey);