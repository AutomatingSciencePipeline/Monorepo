const handler = (req, res) => {
	// await fetch
	const { id } = req.query;

	await fetch(`http://app-backend:5050/experiment`, {
		method: 'POST',
		body: JSON.stringify({experiment: id}),
		headers: new Headers({
			'Content-Type': 'application/json',
		}),
	});
};

export default handler;
