/**
 * Supabase + PromptPay configuration for Newman Exclusive
 */
const SUPABASE_URL = 'https://ghafvssbyniuhzqghtra.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7FUe6MMC8t83aWy_8Kshtg_OeRLZPCU';
const PROMPTPAY_ID = '0879163808'; // Sam's PromptPay-linked mobile number

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
