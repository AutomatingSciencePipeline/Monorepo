import supabase from '../../supabase/client';

const handler = (req, res) => {
	supabase.auth.api.setAuthCookie(req, res);
};

export default handler;
