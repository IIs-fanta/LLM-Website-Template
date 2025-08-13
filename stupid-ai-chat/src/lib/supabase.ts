import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ierqylslaxtnjsymfegm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcnF5bHNsYXh0bmpzeW1mZWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTQ0MTAsImV4cCI6MjA3MDYzMDQxMH0.xMnoVke5DL2thU2di4vXNWkLwg8C5M234_vBAnwGbcc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);