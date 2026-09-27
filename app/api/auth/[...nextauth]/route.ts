export const runtime = 'nodejs';

const authUnavailable = () =>
	Response.json({ error: 'Authentication is not configured.' }, { status: 501 });

export const GET = authUnavailable;
export const POST = authUnavailable;
