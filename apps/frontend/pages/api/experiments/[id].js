// TODO the system should not have to directly communicate with the backend server for this,
// it should just put stuff into firebase + it's backend's job to look for new tasks in fb to run

const handler = (req, res) => {
	const { id } = req.query;
    const {key} = req.body;
    console.log(key);

	fetch('http://localhost:5050/experiment', {
		method: 'POST',
		headers: new Headers({
            'Content-Type': 'application/json',
		}),
        // credentials: 
        body: JSON.stringify({ experiment: {id,key} }),
	}).then((response) => {
        res.status(200).json({response: response})
    })
};

export default handler;
